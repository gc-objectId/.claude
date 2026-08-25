SET search_path TO "mgb-mgh";
DROP VIEW IF EXISTS or2603_check_v;
CREATE VIEW or2603_check_v AS WITH bounds AS (
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
DO $$
DECLARE bad int; missing int;
BEGIN
  SELECT count(*) INTO bad FROM or2603_check_v
   WHERE month_start < date '2026-01-01' OR month_start >= date '2026-04-01';
  SELECT count(*) INTO missing FROM (SELECT date '2026-01-01' m UNION SELECT date '2026-02-01' UNION SELECT date '2026-03-01') want
   WHERE NOT EXISTS (SELECT 1 FROM or2603_check_v v WHERE v.month_start = want.m);
  IF bad > 0 OR missing > 0 THEN
    RAISE EXCEPTION 'OR2603 BOUNDARY CHECK FAILED: % out-of-window month buckets leaked in and % requested months missing', bad, missing;
  END IF;
  RAISE NOTICE 'OR2603 BOUNDARY CHECK PASSED: all month buckets inside the requested Eastern window';
END $$;
DROP VIEW or2603_check_v;
