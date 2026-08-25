-- Shared monthly error rate for the local anesthetic rule subset, by mode.
-- Formula per month/mode: error_rate = non_compliant_firings / local_anesthetic_med_admin_count.
--
-- Numerator rule filter:
--   - w-last-local-anesthetic-max-dose
--   - a-local-anesthetic-max-dose-scan
--   - a-local-anesthetic-max-dose-save
-- Denominator filter:
--   local anesthetic administrations (medication_identifier in the LOCAL_ANESTHETIC set).
--
-- Non-compliance semantics (encoded in the firing facts view feeding the rollup):
--   every firing: one non-compliance per compliance_results row with compliant = FALSE.
--   The application writes what each mode means, so the metric does not restate it.
--
-- Both numerator and denominator come from the EST daily rollups and are filtered on
-- event_date_est against the (Eastern) '2026-01-01'/'2026-04-01' calendar dates, so
-- every month is bucketed and bounded on the same clock. The mode-specific source
-- policy (INTERACTIVE → EMR/APPLICATION, SILENT → EMR) and the operation window are
-- already applied inside mgh_shared_metric_med_admin_facts_v.
WITH bounds AS (
    SELECT '2026-01-01'::date AS start_est,
           '2026-04-01'::date   AS end_est
),
local_anesthetic_medication_identifiers AS (
    SELECT DISTINCT m.medication_identifier
    FROM "mgb-mgh".medications m
    WHERE m.medication_identifier IS NOT NULL
      AND EXISTS (
          SELECT 1
          FROM json_array_elements_text(m.medication_categories) AS category
          WHERE category = 'LOCAL_ANESTHETIC'
      )
),
nonfollow_counts AS (
    SELECT ff.month_start_est                 AS month_start,
           ff.evaluation_mode                 AS mode,
           SUM(ff.non_compliant_firing_count) AS not_followed_count
    FROM "mgb-mgh".mgh_shared_metric_firing_daily_rollup_mv ff
    WHERE ff.event_date_est >= (SELECT start_est FROM bounds)
      AND ff.event_date_est <  (SELECT end_est   FROM bounds)
      AND ff.rule_identifier IN (
          'w-last-local-anesthetic-max-dose',
          'a-local-anesthetic-max-dose-scan',
          'a-local-anesthetic-max-dose-save'
      )
    GROUP BY ff.month_start_est, ff.evaluation_mode
),
med_admin_counts AS (
    SELECT ma.month_start_est   AS month_start,
           ma.evaluation_mode   AS mode,
           SUM(ma.med_admin_count) AS total_count
    FROM "mgb-mgh".mgh_shared_metric_med_admin_daily_rollup_mv ma
             JOIN local_anesthetic_medication_identifiers lam
                  ON lam.medication_identifier = ma.medication_identifier
    WHERE ma.event_date_est >= (SELECT start_est FROM bounds)
      AND ma.event_date_est <  (SELECT end_est   FROM bounds)
    GROUP BY ma.month_start_est, ma.evaluation_mode
)
SELECT lamac.month_start,
       lamac.mode,
       COALESCE(nc.not_followed_count, 0) AS not_followed_count,
       lamac.total_count,
       CASE
           WHEN lamac.total_count = 0 THEN NULL
           ELSE COALESCE(nc.not_followed_count, 0)::numeric / lamac.total_count
       END AS error_rate
FROM med_admin_counts lamac
         LEFT JOIN nonfollow_counts nc
                   ON nc.month_start = lamac.month_start AND nc.mode = lamac.mode
ORDER BY lamac.month_start, lamac.mode;
