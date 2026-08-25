-- OR-2603: LAST deepdive — February drop in the local-anesthetic error rate.
--
-- Metabase question 612 (shared-error-rate-by-month-local-anesthetic) shows the
-- error rate dropping in February 2026. Error rate = non_compliant_firings /
-- local_anesthetic_med_admin_count. The drop is a numerator drop, concentrated in
-- the SILENT-mode `a-local-anesthetic-max-dose-save` alert (its firings ~halved
-- from early February while LA administration volume stayed flat).
--
-- This query is the per-administration backing detail so the drop can be inspected
-- case by case: one row per local anesthetic administration in the window, with the
-- three LAST rules' compliance status (or NULL when a rule did not fire), the
-- administering provider's role, the case ID, and the patient MRN.
--
-- Rule compliance columns (one per LAST rule):
--   'non-compliant' — rule fired and was non-compliant
--   'compliant'     — rule fired and was compliant
--   NULL            — rule did not fire for this administration
--
-- Non-compliance semantics (matches ../metrics/shared_last_research_export.sql / firing_facts_v):
--   Alerts (a-%): SILENT firing → always non-compliant; INTERACTIVE → non-compliant only when rejected
--   Warning (w-%): non-compliant when compliance_results has compliant = FALSE
--
-- Scope & policy (inherited from the shared-metric views):
--   Exclusions: pediatric, cardiac ORs (45-49), Danvers/Waltham (mgh_shared_metric_operations_v)
--   Mode-specific source policy: INTERACTIVE → source_type IN ('EMR','APPLICATION'); SILENT → source_type = 'EMR'
--   Provider resolution: documenting practitioner on the admin, falling back to the
--                        operation's primary (Anesthesia-Start-backfilled) practitioner.
--
-- Metabase parameters: '2026-01-01' / '2026-04-01' are Eastern (America/New_York)
--   calendar dates, closed-open. Defaults for this ticket: 2026-01-01 → 2026-04-01
--   (Jan/Feb/Mar 2026).
--
-- Timezone handling: administration_date and rule created_date are `timestamp
--   without time zone` stored in UTC. We convert them to Eastern wall-clock time and
--   compare against the (Eastern) date parameters — filtering on the SAME clock we
--   bucket the month on. This keeps every month interior-exact and reconciling with
--   question 612. (Filtering the raw UTC value against these bounds instead would
--   leak the prior month's late-evening admins into the first bucket and chop the
--   last month's late-evening admins out of the last bucket.)
WITH bounds AS (
    SELECT '2026-01-01'::date AS start_est,
           '2026-04-01'::date   AS end_est
),
la_medication_ids AS MATERIALIZED (
    SELECT m.id
    FROM "mgb-mgh".medications m
    WHERE EXISTS (
        SELECT 1 FROM json_array_elements_text(m.medication_categories) AS cat
        WHERE cat = 'LOCAL_ANESTHETIC'
    )
),
la_admins AS MATERIALIZED (
    SELECT ma.id                         AS admin_id,
           ma.tracking_id,
           ma.operation_id,
           ma.patient_id,
           (ma.administration_date AT TIME ZONE 'UTC' AT TIME ZONE 'US/Eastern') AS administration_est,
           ma.medication_name,
           ma.dose_amount,
           ma.dose_units,
           COALESCE(ma.route::text, ma.raw_route) AS route,
           ma.documenting_practitioner_id,
           op.evaluation_mode,
           op.primary_practitioner_id,
           op.case_id
    FROM "mgb-mgh".mgh_active_medication_administrations ma
             INNER JOIN "mgb-mgh".mgh_shared_metric_operations_v op ON op.operation_id = ma.operation_id
             INNER JOIN la_medication_ids lam ON lam.id = ma.medication_id
    WHERE (ma.administration_date AT TIME ZONE 'UTC' AT TIME ZONE 'US/Eastern') >= (SELECT start_est FROM bounds)
      AND (ma.administration_date AT TIME ZONE 'UTC' AT TIME ZONE 'US/Eastern') <  (SELECT end_est   FROM bounds)
      AND ma.administration_date >= op.start_time
      AND ma.administration_date <= op.end_time
      AND (
            (op.evaluation_mode = 'INTERACTIVE' AND ma.source_type IN ('EMR', 'APPLICATION'))
         OR (op.evaluation_mode = 'SILENT'      AND ma.source_type = 'EMR')
        )
),
-- Single scan of the three LAST rules, aggregated per (operation_id, tracking_id)
-- so the admin can be labeled without one join per rule.
last_rule_status AS MATERIALIZED (
    SELECT rfr.tracking_id,
           rfr.operation_id,
           BOOL_OR(rfr.rule_identifier = 'a-local-anesthetic-max-dose-scan')                 AS scan_fired,
           BOOL_OR(rfr.rule_identifier = 'a-local-anesthetic-max-dose-scan'
               AND (rfr.evaluation_mode = 'SILENT' OR rfr.accepted = FALSE))                 AS scan_noncompliant,
           BOOL_OR(rfr.rule_identifier = 'a-local-anesthetic-max-dose-save')                 AS save_fired,
           BOOL_OR(rfr.rule_identifier = 'a-local-anesthetic-max-dose-save'
               AND (rfr.evaluation_mode = 'SILENT' OR rfr.accepted = FALSE))                 AS save_noncompliant,
           BOOL_OR(rfr.rule_identifier = 'w-last-local-anesthetic-max-dose')                 AS warning_fired,
           BOOL_OR(rfr.rule_identifier = 'w-last-local-anesthetic-max-dose'
               AND EXISTS (
                   SELECT 1 FROM "mgb-mgh".compliance_results cr
                   WHERE cr.rule_fired_result_id = rfr.id AND cr.compliant = FALSE
               ))                                                                            AS warning_noncompliant
    FROM "mgb-mgh".mgh_rule_fired_results rfr
             INNER JOIN "mgb-mgh".mgh_shared_metric_operations_v op ON op.operation_id = rfr.operation_id
    WHERE rfr.rule_identifier IN (
              'a-local-anesthetic-max-dose-scan',
              'a-local-anesthetic-max-dose-save',
              'w-last-local-anesthetic-max-dose'
          )
      AND (rfr.created_date AT TIME ZONE 'UTC' AT TIME ZONE 'US/Eastern') >= (SELECT start_est FROM bounds)
      AND (rfr.created_date AT TIME ZONE 'UTC' AT TIME ZONE 'US/Eastern') <  (SELECT end_est   FROM bounds)
      AND rfr.evaluation_mode = op.evaluation_mode
    GROUP BY rfr.tracking_id, rfr.operation_id
)
SELECT date_trunc('month', la.administration_est)::date                                    AS month,
       la.evaluation_mode                                                                  AS mode,
       la.case_id,
       p.mrn,
       la.admin_id,
       la.administration_est::timestamp                                                    AS administration_date,
       la.medication_name,
       la.dose_amount,
       la.dose_units,
       la.route,
       -- What rule fired (and if one didn't fire → NULL).
       CASE WHEN lrs.scan_noncompliant    THEN 'non-compliant'
            WHEN lrs.scan_fired           THEN 'compliant' END                             AS "a-local-anesthetic-max-dose-scan",
       CASE WHEN lrs.save_noncompliant    THEN 'non-compliant'
            WHEN lrs.save_fired           THEN 'compliant' END                             AS "a-local-anesthetic-max-dose-save",
       CASE WHEN lrs.warning_noncompliant THEN 'non-compliant'
            WHEN lrs.warning_fired        THEN 'compliant' END                             AS "w-last-local-anesthetic-max-dose",
       -- Convenience roll-ups for pivoting the drop.
       COALESCE(lrs.scan_fired OR lrs.save_fired OR lrs.warning_fired, FALSE)              AS any_last_rule_fired,
       COALESCE(lrs.scan_noncompliant OR lrs.save_noncompliant OR lrs.warning_noncompliant, FALSE)
                                                                                           AS any_last_rule_non_compliant,
       -- Who administered the med.
       COALESCE(doc_prac.role, pri_prac.role)                                             AS provider_role,
       COALESCE(doc_prac.epic_user_id, pri_prac.epic_user_id)                             AS provider_id
FROM la_admins la
         LEFT JOIN last_rule_status lrs
                   ON lrs.operation_id = la.operation_id AND lrs.tracking_id = la.tracking_id
         LEFT JOIN "mgb-mgh".patients p ON p.id = la.patient_id
         LEFT JOIN "mgb-mgh".practitioners doc_prac ON doc_prac.id = la.documenting_practitioner_id
         LEFT JOIN "mgb-mgh".practitioners pri_prac ON pri_prac.id = la.primary_practitioner_id
ORDER BY la.administration_est, la.admin_id;
