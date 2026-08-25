SET search_path TO "mgb-mgh";
DROP VIEW IF EXISTS or2603_check_v;
CREATE VIEW or2603_check_v AS WITH timeframe AS (
    SELECT timezone('UTC', timezone('US/Eastern', '2026-01-01')) AS timeframe_start,
           timezone('UTC', timezone('US/Eastern', '2026-04-01'))   AS timeframe_end
),
timeframe_dates AS (
    SELECT timezone('US/Eastern', timezone('UTC', timeframe_start))::date AS start_date_est,
           timezone('US/Eastern', timezone('UTC', timeframe_end))::date   AS end_date_est_exclusive
    FROM timeframe
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
    WHERE ff.event_date_est >= (SELECT start_date_est       FROM timeframe_dates)
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
