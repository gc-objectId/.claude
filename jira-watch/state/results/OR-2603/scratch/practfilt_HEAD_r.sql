-- Shared monthly error rate for the local anesthetic rule subset, by mode.
-- Denominator is restricted to administrations documented by anesthesia role practitioners.
-- Formula per month/mode: error_rate = non_compliant_firings / local_anesthetic_med_admin_count.
--
-- Numerator rule filter:
--   - w-last-local-anesthetic-max-dose
--   - a-local-anesthetic-max-dose-scan
--   - a-local-anesthetic-max-dose-save
-- Denominator filter:
--   medication_administrations joined to medications where medication_categories contains LOCAL_ANESTHETIC,
--   restricted to documenting practitioners in the mapped anesthesia role groups.
--
-- Anesthesia role groups: Anesthesiologist, Resident/Fellow, CRNA.
--
-- Non-compliance semantics:
--   every firing: one non-compliance per compliance_results row with compliant = FALSE.
--   The application writes what each mode means, so the metric does not restate it.
--
-- Mode-specific numerator and denominator both joined to mode-specific operation views:
--   INTERACTIVE → mgh_interactive_operations, source_type IN ('EMR', 'APPLICATION'), rfr.evaluation_mode = 'INTERACTIVE'
--   SILENT      → mgh_silent_mode_operations, source_type = 'EMR',                  rfr.evaluation_mode = 'SILENT'
--
-- Timezone handling: administration_date is `timestamp without time zone` stored in UTC.
-- We convert it to Eastern wall-clock time and both bound (against the Eastern
-- '2026-01-01'/'2026-04-01' calendar dates) and bucket the month on that same clock,
-- so every month is interior-exact. The numerator reads the firing rollup on
-- event_date_est, which is already Eastern. (The denominator keeps its documenting-
-- practitioner-only role filter rather than the rollup's resolved role, which falls
-- back to the operation's primary practitioner.)
WITH bounds AS (
    SELECT '2026-01-01'::date AS start_est,
           '2026-04-01'::date   AS end_est
),
role_mapping AS (
    SELECT 'Anesthesiologist'::text AS role_group, 'Anesthesiologist'::text AS practitioner_role
    UNION ALL SELECT 'Resident/Fellow', 'Fellow'
    UNION ALL SELECT 'Resident/Fellow', 'Resident'
    UNION ALL SELECT 'CRNA', 'Nurse Anesthetist'
    UNION ALL SELECT 'CRNA', 'Student Nurse Anesthetist'
    UNION ALL SELECT 'CRNA', 'Nurse Anesthetist - Independent'
),
local_anesthetic_medications AS MATERIALIZED (
    SELECT m.id
    FROM "mgb-mgh".medications m
    WHERE EXISTS (
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
interactive_med_admin_counts AS (
    SELECT date_trunc('month', timezone('US/Eastern', timezone('UTC', ma.administration_date)))::date AS month_start,
           'INTERACTIVE'::text AS mode,
           COUNT(*) AS total_count
    FROM "mgb-mgh".mgh_active_medication_administrations ma
             JOIN "mgb-mgh".mgh_interactive_operations o ON o.operation_id = ma.operation_id
             JOIN local_anesthetic_medications lam ON lam.id = ma.medication_id
             JOIN "mgb-mgh".practitioners doc_prac ON doc_prac.id = ma.documenting_practitioner_id
             JOIN role_mapping rm ON rm.practitioner_role = doc_prac.role
    WHERE timezone('US/Eastern', timezone('UTC', ma.administration_date)) >= (SELECT start_est FROM bounds)
      AND timezone('US/Eastern', timezone('UTC', ma.administration_date)) <  (SELECT end_est   FROM bounds)
      AND ma.administration_date >= o.start_time
      AND ma.administration_date <= o.end_time
      AND ma.source_type IN ('EMR', 'APPLICATION')
    GROUP BY 1
),
silent_med_admin_counts AS (
    SELECT date_trunc('month', timezone('US/Eastern', timezone('UTC', ma.administration_date)))::date AS month_start,
           'SILENT'::text AS mode,
           COUNT(*) AS total_count
    FROM "mgb-mgh".mgh_active_medication_administrations ma
             JOIN "mgb-mgh".mgh_silent_mode_operations o ON o.operation_id = ma.operation_id
             JOIN local_anesthetic_medications lam ON lam.id = ma.medication_id
             JOIN "mgb-mgh".practitioners doc_prac ON doc_prac.id = ma.documenting_practitioner_id
             JOIN role_mapping rm ON rm.practitioner_role = doc_prac.role
    WHERE timezone('US/Eastern', timezone('UTC', ma.administration_date)) >= (SELECT start_est FROM bounds)
      AND timezone('US/Eastern', timezone('UTC', ma.administration_date)) <  (SELECT end_est   FROM bounds)
      AND ma.administration_date >= o.start_time
      AND ma.administration_date <= o.end_time
      AND ma.source_type = 'EMR'
    GROUP BY 1
),
med_admin_counts AS (
    SELECT * FROM interactive_med_admin_counts
    UNION ALL
    SELECT * FROM silent_med_admin_counts
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
