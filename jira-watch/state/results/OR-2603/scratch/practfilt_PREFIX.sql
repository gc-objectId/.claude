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
--   INTERACTIVE alerts: firing evaluation_mode = INTERACTIVE and accepted = FALSE
--   SILENT alerts:      firing evaluation_mode = SILENT (all firings)
--   Warnings:           compliance_results has compliant = FALSE
--
-- Mode-specific numerator and denominator both joined to mode-specific operation views:
--   INTERACTIVE → mgh_interactive_operations, source_type IN ('EMR', 'APPLICATION'), rfr.evaluation_mode = 'INTERACTIVE'
--   SILENT      → mgh_silent_mode_operations, source_type = 'EMR',                  rfr.evaluation_mode = 'SILENT'
WITH timeframe AS (
    SELECT timezone('UTC', timezone('US/Eastern', {{START_DATE}})) AS timeframe_start,
           timezone('UTC', timezone('US/Eastern', {{END_DATE}}))   AS timeframe_end
),
timeframe_dates AS (
    SELECT timezone('US/Eastern', timezone('UTC', timeframe_start))::date AS start_date_est,
           timezone('US/Eastern', timezone('UTC', timeframe_end))::date   AS end_date_est_exclusive
    FROM timeframe
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
    WHERE ff.event_date_est >= (SELECT start_date_est        FROM timeframe_dates)
      AND ff.event_date_est <  (SELECT end_date_est_exclusive FROM timeframe_dates)
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
    WHERE ma.administration_date >= (SELECT timeframe_start FROM timeframe)
      AND ma.administration_date <  (SELECT timeframe_end FROM timeframe)
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
    WHERE ma.administration_date >= (SELECT timeframe_start FROM timeframe)
      AND ma.administration_date <  (SELECT timeframe_end FROM timeframe)
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
