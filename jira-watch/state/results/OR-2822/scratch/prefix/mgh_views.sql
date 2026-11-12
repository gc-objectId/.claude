-- Single entry point to (re)create all MGH analytics views and materialized views.
-- Run this file end-to-end to rebuild everything from scratch.
--
-- Dependency order:
--   1. mgh_operations_incl_unknown_room_v (base patient + operation join, room_known flag)
--   2. mgh_operations (room-known subset of the above)
--   3. mgh_interactive_operations, mgh_silent_mode_operations (mode + room filters)
--   4. mgh_rule_fired_results (all firings over adult non-excluded operations, + room_known)
--   5. mgh_shared_metric_operations_v (union of both mode views)
--   6. mgh_shared_metric_operations_incl_unknown_room_v (cohort + unknown-room)
--   7. mgh_shared_metric_rule_scope_v (rule classification)
--   8. mgh_shared_metric_*_facts_incl_unknown_room_v, then the room-known *_facts_v wrappers
--   9. mgh_shared_metric_atomic_events_v (unified event stream)
--  10. mgh_shared_metric_firing_daily_rollup_mv, mgh_shared_metric_med_admin_daily_rollup_mv,
--      mgh_shared_metric_infusion_daily_rollup_mv (rollups)
--  11. mgh_shared_metric_denominator_daily_rollup_v (bolus + infusion denominator, tagged by admin_type)
--  12. Indexes on materialized views
--
-- Room-name policy, stated once because it is easy to get wrong:
-- operating_room_name is the ONLY attribute that establishes site and cohort enrollment.
-- evaluation_mode does not: SILENT is set on nearly every adult operation, including Danvers,
-- Waltham and cardiac rooms, so it cannot stand in for a room filter.
--
-- Operations whose room name could not be pulled are therefore of UNKNOWN cohort membership,
-- not "excluded" and not "included". They are carried through the *_incl_unknown_room_v views
-- with room_known = false so research can report on them, and are filtered out of every view
-- feeding a published metric. The published rollups read the room-known views only.
--
-- A NULL room name and an empty-string room name mean the same thing and are treated
-- identically everywhere: both are room_known = false. Only room_known should be used to test
-- this; an IS NOT NULL check alone silently admits empty strings.
--
-- Rooms that are known and out of scope (Danvers/Waltham, cardiac ORs, rooms matching no mode
-- cohort) are excluded outright and appear in none of these views.

SET search_path TO "mgb-mgh";

-- ============================================================
-- Drop everything in reverse dependency order
-- ============================================================

DROP VIEW IF EXISTS mgh_shared_metric_denominator_daily_rollup_v;
DROP MATERIALIZED VIEW IF EXISTS mgh_shared_metric_firing_daily_rollup_mv;
DROP MATERIALIZED VIEW IF EXISTS mgh_shared_metric_med_admin_daily_rollup_mv;
DROP MATERIALIZED VIEW IF EXISTS mgh_shared_metric_infusion_daily_rollup_mv;
DROP MATERIALIZED VIEW IF EXISTS mgh_shared_metric_daily_rollup_mv;
DROP VIEW IF EXISTS mgh_shared_metric_atomic_events_v;
DROP VIEW IF EXISTS mgh_shared_metric_med_admin_facts_v;
DROP VIEW IF EXISTS mgh_shared_metric_firing_facts_v;
DROP VIEW IF EXISTS mgh_shared_metric_med_admin_facts_incl_unknown_room_v;
DROP VIEW IF EXISTS mgh_shared_metric_firing_facts_incl_unknown_room_v;
DROP VIEW IF EXISTS mgh_shared_metric_infusion_facts_v;
DROP VIEW IF EXISTS mgh_shared_metric_infusion_facts_incl_unknown_room_v;
DROP VIEW IF EXISTS mgh_shared_metric_rule_scope_v;
-- Retired name. An earlier revision materialized the rule classification here and kept
-- mgh_shared_metric_rule_scope_v as a wrapper over it; it is a plain view again. DROP VIEW will
-- not remove a materialized view and IF EXISTS does not rescue a name of the wrong relkind, so
-- this line has to stay for the script to run against databases built from that revision.
DROP MATERIALIZED VIEW IF EXISTS mgh_shared_metric_rule_scope_mv;
DROP VIEW IF EXISTS mgh_shared_metric_operations_incl_unknown_room_v;
DROP VIEW IF EXISTS mgh_shared_metric_operations_v;
DROP VIEW IF EXISTS mgh_active_medication_administrations;
DROP VIEW IF EXISTS mgh_active_infusion_medication_administrations;
DROP VIEW IF EXISTS mgh_rule_fired_results;
-- Retired name. An earlier revision split firings into a narrow mgh_rule_fired_results plus a
-- wide mgh_rule_fired_results_incl_unknown_room; the two were later collapsed into the single
-- broad view above. Databases built against that revision still carry the old view, and it
-- depends on the base operations view, so leaving it out makes this script fail partway through
-- the drop block. Retired names have to stay here for the script to stay re-runnable.
DROP VIEW IF EXISTS mgh_rule_fired_results_incl_unknown_room;
DROP VIEW IF EXISTS mgh_interactive_operations;
DROP VIEW IF EXISTS mgh_silent_mode_operations;
DROP VIEW IF EXISTS mgh_operations;
DROP VIEW IF EXISTS mgh_operations_incl_unknown_room_v;
-- Retired name for the view above, briefly called _classified_v, which said nothing about what it
-- classified. Databases built against that revision still carry it, so the drop has to stay for this
-- script to be re-runnable. Everything that depended on it is dropped earlier in this block.
DROP VIEW IF EXISTS mgh_operations_classified_v;

-- ============================================================
-- Base views
-- ============================================================

-- Adult operations, carrying the room_known flag but NOT yet filtered on it. mgh_operations is
-- this view plus WHERE room_known; that is the only difference between the two.
-- Computing the flag here instead of filtering is what lets the unknown-room population be
-- reported on instead of silently vanishing. Previously they disappeared implicitly, because a
-- regex comparison against a NULL room name yields NULL rather than true, so every downstream
-- view dropped them without ever saying so.
-- Known-and-out-of-scope rooms (Danvers/Waltham, cardiac) are excluded here and go no further.
CREATE OR REPLACE VIEW mgh_operations_incl_unknown_room_v AS
SELECT p.pmrn,
       o.case_id,
       o.operating_room_name,
       o.start_time,
       o.end_time,
       o.pediatric_status,
       o.evaluation_mode,
       COALESCE(o.acuity, o.classification) AS acuity,
       o.id                    AS operation_id,
       p.id                    AS patient_id,
       o.primary_practitioner_id,
       (o.operating_room_name IS NOT NULL
           AND o.operating_room_name <> '')     AS room_known
FROM "mgb-mgh".operations o
         JOIN "mgb-mgh".patients p ON p.id = o.patient_id
WHERE o.pediatric_status = 'ADULT'                        -- exclude pediatric (OR-2196)
  AND (o.operating_room_name IS NULL
    OR o.operating_room_name = ''
    OR (o.operating_room_name !~* '^MGH (DAN|WAL)'        -- exclude Danvers and Waltham
        AND o.operating_room_name !~* '^MGH OR 4[5-9]$')  -- exclude cardiac ORs (OR-2159)
    );


-- Room-known subset: operations whose room name we actually have.
-- A NULL and an empty-string room name both mean the same thing, that the name could not be
-- pulled, so both are treated as unknown. The original definition split them by accident: NULL
-- failed the regex exclusions (NULL comparisons are not true) and was dropped, while an empty
-- string passed them and was kept. That put 430 operations in this view whose site was no more
-- verifiable than the ones being excluded.
-- Those 430 now live in the *_incl_unknown_room_v views instead, where they can be reported on.
-- No published metric moves: an empty room matches neither mode cohort, so
-- mgh_shared_metric_operations_v never contained them.
CREATE OR REPLACE VIEW mgh_operations AS
SELECT pmrn,
       case_id,
       operating_room_name,
       start_time,
       end_time,
       pediatric_status,
       evaluation_mode,
       acuity,
       operation_id,
       patient_id,
       primary_practitioner_id
FROM "mgb-mgh".mgh_operations_incl_unknown_room_v
WHERE room_known;


CREATE OR REPLACE VIEW mgh_interactive_operations AS
SELECT *
FROM "mgb-mgh".mgh_operations
WHERE operating_room_name IN
      ('MGH OR 04', 'MGH OR 05', 'MGH OR 06', 'MGH OR 07',
       'MGH OR 10', 'MGH OR 11', 'MGH OR 12',
       'MGH OR 32', 'MGH OR 33', 'MGH OR 34', 'MGH OR 35',
       'MGH OR 36', 'MGH OR 37', 'MGH OR 38', 'MGH OR 39',
       'MGH OR 40', 'MGH OR 41', 'MGH OR 42', 'MGH OR 43')
  AND evaluation_mode = 'INTERACTIVE';

CREATE OR REPLACE VIEW mgh_silent_mode_operations AS
SELECT *
FROM "mgb-mgh".mgh_operations
WHERE operating_room_name ~* '^MGH OR (0[1-9]|[1-8][0-9]|9[01])$' -- ORs 1-91
  AND evaluation_mode = 'SILENT';


-- All rule firings on adult, non-excluded operations, time-bounded to their own operation.
-- This view filters FIRINGS; it deliberately does not impose an operation cohort. Callers are
-- expected to qualify which operations they care about, normally by joining
-- mgh_shared_metric_operations_v. room_known is exposed so a caller can drop operations whose
-- room name could not be pulled, but this view does not drop them on the caller's behalf:
-- narrowing here would silently change the scope of every report that reads it.
--
-- Each bound is applied only where it exists, matching mayo_rule_fired_results. Comparing
-- against a NULL bound yields NULL, so the stricter form dropped every unfinished case here
-- without saying so, and made this view enforce a cohort rule it does not own.
-- mgh_shared_metric_operations_v states that rule instead, so a half-open case stays
-- reconcilable from this view while feeding no metric.
CREATE OR REPLACE VIEW mgh_rule_fired_results AS
SELECT rec.evaluation_mode,
       rec.tracking_id,
       rec.operation_id,
       rec.user_id                                                            AS evaluating_user_id,
       rec.evaluating_practitioner_id,
       o.operating_room_name,
       rfr.id,
       rfr.rule_identifier,
       rfr.created_date,
       rfr.details,
       rfr.prompt,
       rfr.accepted,
       rfr.rejection_reason,
       rfr.rejection_reason_comment,
       rfr.responder_id,
       COALESCE(evaluating_practitioner.name, u.username, 'UNKNOWN')         AS evaluating_practitioner_name,
       COALESCE(evaluating_practitioner.role, user_practitioner.role, 'UNKNOWN') AS evaluating_practitioner_role,
       o.room_known
FROM "mgb-mgh".rule_execution_contexts rec
         INNER JOIN "mgb-mgh".rule_fired_results rfr ON rfr.rule_execution_context_id = rec.id
         INNER JOIN "mgb-mgh".mgh_operations_incl_unknown_room_v o ON o.operation_id = rec.operation_id
         LEFT JOIN "mgb-mgh".practitioners evaluating_practitioner ON evaluating_practitioner.id = rec.evaluating_practitioner_id
         LEFT JOIN "public".users u ON u.id = rec.user_id
         LEFT JOIN "mgb-mgh".practitioners user_practitioner ON user_practitioner.user_id = u.id
WHERE (o.start_time IS NULL OR rfr.created_date >= o.start_time)
  AND (o.end_time IS NULL OR rfr.created_date <= o.end_time);


-- Active (non-soft-deleted) medication administrations.
-- Analytics queries should always read from these views instead of the raw tables so
-- soft-deleted rows are excluded by default. The COALESCE handles rows from before
-- the `deleted` column existed (NULL means not deleted).
CREATE OR REPLACE VIEW mgh_active_medication_administrations AS
SELECT *
FROM "mgb-mgh".medication_administrations
WHERE COALESCE(deleted, false) = false;

CREATE OR REPLACE VIEW mgh_active_infusion_medication_administrations AS
SELECT *
FROM "mgb-mgh".infusion_medication_administrations
WHERE COALESCE(deleted, false) = false;


-- ============================================================
-- Shared metric layer
-- ============================================================

-- Shared operation cohort across both modes. Centralizes operation inclusion logic.
--
-- Closed cases only. A case with no start or no stop has an open-ended window, so its firing
-- and administration counts are still accumulating and any rate computed over it is a rate
-- over a partial denominator. Requiring both bounds keeps every metric period final once it is
-- reported, and matches mayo_shared_metric_operations_v. mgh_rule_fired_results used to enforce
-- this as a side effect of comparing against a NULL bound; it is stated here now that it does not.
CREATE OR REPLACE VIEW mgh_shared_metric_operations_v AS
SELECT *
FROM (SELECT * FROM "mgb-mgh".mgh_interactive_operations
      UNION ALL
      SELECT * FROM "mgb-mgh".mgh_silent_mode_operations) modes
WHERE start_time IS NOT NULL
  AND end_time IS NOT NULL;


-- Research cohort: the shared cohort plus operations whose room name could not be pulled.
-- Unknown-room operations cannot be assigned to a mode cohort by room, so they are taken at
-- their own evaluation_mode. Restricting to the two known modes keeps the mode-specific
-- source_type policy in the med-admin facts well defined.
-- RESEARCH ONLY. Never point a published metric at this view: the unknown-room population is
-- large and mostly inactive (~99% carry no medication administrations at all), and its site is
-- by definition unverifiable, so including it would distort any rate computed from it.
--
-- The closed-case rule reaches the room-known half through mgh_shared_metric_operations_v and
-- is deliberately not repeated on the unknown-room half. Research asks what happened, including
-- on cases still in flight; the published wrappers filter on room_known, so nothing open reaches
-- a metric either way.
CREATE OR REPLACE VIEW mgh_shared_metric_operations_incl_unknown_room_v AS
SELECT pmrn,
       case_id,
       operating_room_name,
       start_time,
       end_time,
       pediatric_status,
       evaluation_mode,
       acuity,
       operation_id,
       patient_id,
       primary_practitioner_id,
       TRUE AS room_known
FROM "mgb-mgh".mgh_shared_metric_operations_v
UNION ALL
SELECT pmrn,
       case_id,
       operating_room_name,
       start_time,
       end_time,
       pediatric_status,
       evaluation_mode,
       acuity,
       operation_id,
       patient_id,
       primary_practitioner_id,
       FALSE
FROM "mgb-mgh".mgh_operations_incl_unknown_room_v
WHERE NOT room_known
  AND evaluation_mode IN ('INTERACTIVE', 'SILENT');


-- Rule normalization:
-- - rule_bucket drives breakout rows.
-- - in_metric_scope determines which firings feed error/non-follow metrics.
--
-- Category membership is tested with the jsonb ?| ("has any of these keys/elements") operator
-- rather than EXISTS over json_array_elements_text. A correlated subquery per category cannot be
-- flattened, so the planner re-evaluated all four of them per firing: a one-day firing query
-- seq-scanned rule_definitions 1,093 times and made ~153,000 json_array_elements_text calls to
-- classify 110 static rules. As plain scalar expressions the whole view collapses to a 110-row
-- relation the planner hash-joins once, at a cost of three buffers. Verified equivalent to the
-- EXISTS form: zero of the 110 rules classify differently.
--
-- Deliberately a plain view. Materializing it and indexing rule_identifier saves two of those
-- three buffers and buys a refresh-ordering dependency: rule_definitions changes would not reach
-- any metric until someone remembered to refresh, and a forgotten refresh misclassifies rules
-- silently. Not a trade worth making for 110 static rows.
CREATE OR REPLACE VIEW mgh_shared_metric_rule_scope_v AS
WITH category_flags AS (
    SELECT rd.id AS rule_identifier,
           (rd.id LIKE 'a-%')                                       AS is_alert,
           (rd.categories::jsonb ?| ARRAY['COMPLIANCE_SINGLE_MAX_DOSE',
                                          'COMPLIANCE_CUMULATIVE_MAX_DOSE'])     AS is_max_dose,
           (rd.categories::jsonb ?| ARRAY['COMPLIANCE_DEFAULT_DOSE'])            AS is_default_dose,
           (rd.categories::jsonb ?| ARRAY['COMPLIANCE_SINGLE_MIN_DOSE'])         AS is_min_dose,
           (rd.categories::jsonb ?| ARRAY['COMPLIANCE_MEDICATION_ADMINISTERED',
                                          'COMPLIANCE_MEDICATION_NOT_ADMINISTERED']) AS is_med_admin
    FROM "mgb-mgh".rule_definitions rd
)
SELECT cf.rule_identifier,
       CASE
           WHEN is_alert THEN 'alert'
           WHEN is_max_dose THEN 'max-dose'
           WHEN is_default_dose THEN 'default-dose'
           WHEN is_min_dose THEN 'min-dose'
           WHEN is_med_admin THEN 'med-admin'
           ELSE 'other'
       END                                                                    AS rule_bucket,
       (is_alert OR is_max_dose OR is_default_dose OR is_min_dose
        OR is_med_admin)                                                      AS in_metric_scope
FROM category_flags cf;


-- Canonical firing facts used by both metrics.
-- One row per fired rule result in scope.
--
-- The operation is joined on evaluation_mode as well as id, so a firing evaluated under a
-- different mode than its case is in feeds no metric. That keeps evaluation_mode a single axis:
-- it means the same thing on this view as on the med-admin denominator, which can only be keyed
-- on the case's mode because an administration carries no execution context. mayo does the same.
-- The dropped firings stay visible in mgh_rule_fired_results.
--
-- Computes non-compliance semantics once and resolves practitioner role:
--   a) evaluating_practitioner_id from rule_execution_context (primary)
--   b) documenting practitioner by operation_id + tracking_id (fallback when evaluating practitioner is missing)
CREATE OR REPLACE VIEW mgh_shared_metric_firing_facts_incl_unknown_room_v AS
-- Aggregated up front rather than probed per firing. A correlated lookup wins only on windows
-- narrower than any caller uses: at 1,344 firings it costs 19ms against this CTE's 283ms, but the
-- two cross well before month scale, and mgh_shared_metric_firing_daily_rollup_mv reads this view
-- with no date filter at all. Over the full 787k firings the correlated form takes 1,072ms and
-- 2.75M buffers against 213ms and 584k here, so the daily refresh pays 5x for it.
WITH compliance_summary AS (
    SELECT cr.rule_fired_result_id AS firing_id,
           COUNT(*) FILTER (WHERE cr.compliant = FALSE) AS non_compliant_result_count
    FROM "mgb-mgh".compliance_results cr
    GROUP BY cr.rule_fired_result_id
),
     documenting_role_by_tracking AS (
         SELECT ma.operation_id,
                ma.tracking_id,
                MAX(doc_prac.role) AS documenting_practitioner_role
         FROM "mgb-mgh".mgh_active_medication_administrations ma
                  LEFT JOIN "mgb-mgh".practitioners doc_prac ON doc_prac.id = ma.documenting_practitioner_id
         WHERE ma.tracking_id IS NOT NULL
         GROUP BY ma.operation_id, ma.tracking_id
     )
SELECT rfr.id                                                                           AS firing_id,
       rfr.created_date                                                                 AS event_time_utc,
       DATE_TRUNC('day', timezone('US/Eastern', to_timestamp(extract(epoch from rfr.created_date))))::date  AS event_date_est,
       DATE_TRUNC('month', timezone('US/Eastern', to_timestamp(extract(epoch from rfr.created_date))))::date AS month_start_est,
       rfr.evaluation_mode,
       rfr.operation_id,
       rfr.tracking_id,
       op.start_time                                                                    AS operation_start_time_utc,
       DATE_TRUNC('day', timezone('US/Eastern', to_timestamp(extract(epoch from op.start_time))))::date  AS operation_start_date_est,
       op.end_time                                                                      AS operation_end_time_utc,
       op.operating_room_name,
       rfr.rule_identifier,
       COALESCE(scope.rule_bucket,
                CASE WHEN rfr.rule_identifier LIKE 'a-%' THEN 'alert' ELSE 'other' END) AS rule_bucket,
       COALESCE(rfr.details ->> 'MEDICATION_IDENTIFIER',
                rfr.details ->> 'MEDICATION_ID',
                'UNKNOWN')                                                               AS medication_identifier,
       rfr.accepted,
       rfr.evaluating_practitioner_id,
       COALESCE(eval_prac.name, rfr.evaluating_practitioner_name, 'UNKNOWN')            AS evaluating_practitioner_name,
       COALESCE(eval_prac.role, 'UNKNOWN')                                              AS evaluating_practitioner_role,
       doc_role.documenting_practitioner_role,
       CASE
           WHEN eval_prac.role IS NOT NULL THEN eval_prac.role
           WHEN rfr.evaluating_practitioner_id IS NULL
               AND rfr.tracking_id IS NOT NULL
               THEN COALESCE(doc_role.documenting_practitioner_role, primary_prac.role, 'UNKNOWN')
           ELSE COALESCE(primary_prac.role, 'UNKNOWN')
       END                                                                               AS resolved_practitioner_role,
       -- Non-compliance count: number of non-compliant results per firing.
       -- Alerts produce 0 or 1; warnings can produce multiple (one per non-compliant compliance_result).
       -- compliance_results is the sole source of truth. A silent alert is stamped non-compliant when
       -- it fires and an interactive one when the practitioner rejects it, so both already land here.
       -- Rules claimed by an AlertComplianceOverride decide from the clinical record instead: an
       -- antibiotic redose reminder is compliant when the dose was given inside its window, and the
       -- ERAS antiemetics alert re-evaluates at anesthesia stop regardless of accept or reject.
       COALESCE(cs.non_compliant_result_count, 0)                                        AS non_compliant_count,
       -- Override count: the practitioner rejected the alert. Deliberately separate from
       -- non-compliance, which is a clinical verdict an AlertComplianceOverride evaluator can
       -- reach independently of what the practitioner pressed. A rejected antibiotic redose
       -- whose dose landed in-window is an override and not an error.
       CASE WHEN rfr.accepted = FALSE THEN 1 ELSE 0 END                                  AS overridden_count,
       TRUE                                                                              AS is_firing_denominator,
       op.room_known
FROM "mgb-mgh".mgh_rule_fired_results rfr
         INNER JOIN "mgb-mgh".mgh_shared_metric_operations_incl_unknown_room_v op
                    ON op.operation_id = rfr.operation_id
                        AND op.evaluation_mode = rfr.evaluation_mode
         LEFT JOIN "mgb-mgh".mgh_shared_metric_rule_scope_v scope ON scope.rule_identifier = rfr.rule_identifier
         LEFT JOIN "mgb-mgh".practitioners eval_prac ON eval_prac.id = rfr.evaluating_practitioner_id
         LEFT JOIN compliance_summary cs ON cs.firing_id = rfr.id
         LEFT JOIN documenting_role_by_tracking doc_role
                   ON doc_role.operation_id = rfr.operation_id
                       AND doc_role.tracking_id = rfr.tracking_id
         LEFT JOIN "mgb-mgh".practitioners primary_prac ON primary_prac.id = op.primary_practitioner_id
WHERE COALESCE(scope.in_metric_scope, rfr.rule_identifier LIKE 'a-%');


-- Room-known subset, and the only firing view a published metric should read.
-- Output is identical to the original mgh_shared_metric_firing_facts_v definition.
CREATE OR REPLACE VIEW mgh_shared_metric_firing_facts_v AS
SELECT firing_id,
       event_time_utc,
       event_date_est,
       month_start_est,
       evaluation_mode,
       operation_id,
       tracking_id,
       operation_start_time_utc,
       operation_start_date_est,
       operation_end_time_utc,
       operating_room_name,
       rule_identifier,
       rule_bucket,
       medication_identifier,
       accepted,
       evaluating_practitioner_id,
       evaluating_practitioner_name,
       evaluating_practitioner_role,
       documenting_practitioner_role,
       resolved_practitioner_role,
       non_compliant_count,
       overridden_count,
       is_firing_denominator
FROM "mgb-mgh".mgh_shared_metric_firing_facts_incl_unknown_room_v
WHERE room_known;


-- Canonical med-admin facts for the error-rate denominator.
-- Mode-specific source_type policy is enforced here:
-- - INTERACTIVE: source_type IN ('EMR', 'APPLICATION')
-- - SILENT: source_type = 'EMR'
CREATE OR REPLACE VIEW mgh_shared_metric_med_admin_facts_incl_unknown_room_v AS
SELECT ma.id                                                                            AS med_admin_id,
       ma.administration_date                                                           AS event_time_utc,
       DATE_TRUNC('day', timezone('US/Eastern', to_timestamp(extract(epoch from ma.administration_date))))::date  AS event_date_est,
       DATE_TRUNC('month', timezone('US/Eastern', to_timestamp(extract(epoch from ma.administration_date))))::date AS month_start_est,
       op.evaluation_mode,
       ma.operation_id,
       ma.tracking_id,
       op.start_time                                                                    AS operation_start_time_utc,
       DATE_TRUNC('day', timezone('US/Eastern', to_timestamp(extract(epoch from op.start_time))))::date  AS operation_start_date_est,
       op.end_time                                                                      AS operation_end_time_utc,
       op.operating_room_name,
       COALESCE(ma.medication_identifier, 'UNKNOWN')                                   AS medication_identifier,
       ma.source_type,
       ma.documenting_practitioner_id,
       COALESCE(doc_prac.role, primary_prac.role)                                      AS documenting_practitioner_role,
       op.room_known
FROM "mgb-mgh".mgh_active_medication_administrations ma
         INNER JOIN "mgb-mgh".mgh_shared_metric_operations_incl_unknown_room_v op
                    ON op.operation_id = ma.operation_id
         LEFT JOIN "mgb-mgh".practitioners doc_prac ON doc_prac.id = ma.documenting_practitioner_id
         LEFT JOIN "mgb-mgh".practitioners primary_prac ON primary_prac.id = op.primary_practitioner_id
WHERE ma.administration_date >= op.start_time
  AND ma.administration_date <= op.end_time
  AND (
        (op.evaluation_mode = 'INTERACTIVE' AND ma.source_type IN ('EMR', 'APPLICATION'))
        OR (op.evaluation_mode = 'SILENT' AND ma.source_type = 'EMR')
    );


-- Room-known subset, and the only med-admin view a published metric should read.
-- Output is identical to the original mgh_shared_metric_med_admin_facts_v definition.
CREATE OR REPLACE VIEW mgh_shared_metric_med_admin_facts_v AS
SELECT med_admin_id,
       event_time_utc,
       event_date_est,
       month_start_est,
       evaluation_mode,
       operation_id,
       tracking_id,
       operation_start_time_utc,
       operation_start_date_est,
       operation_end_time_utc,
       operating_room_name,
       medication_identifier,
       source_type,
       documenting_practitioner_id,
       documenting_practitioner_role
FROM "mgb-mgh".mgh_shared_metric_med_admin_facts_incl_unknown_room_v
WHERE room_known;


-- Canonical infusion facts, the optional second half of the error-rate denominator.
-- One row per infusion, never per infusion event: an infusion is a single administration however
-- many start, rate-change and stop events it accumulates. In practice that is one infusion per
-- medication order per medication, and DISTINCT ON enforces that grain rather than assuming it,
-- because the same infusion is occasionally written twice. The surviving row is the one documented
-- earliest, then the one covering the widest event window.
-- Mirrors mgh_shared_metric_med_admin_facts_incl_unknown_room_v so the two sum without reconciling
-- definitions: same mode-specific source_type policy, and the same containment rule applied to the
-- infusion's first documented event. An infusion already running when the case opened is excluded,
-- exactly as a pre-op bolus is, which keeps every counted row inside the case window.
-- A timed bolus converted upstream into a START/STOP infusion can leave its original bolus row in
-- place, so a small number of administrations land on both sides. Not corrected here: the duplicate
-- is written upstream, and filtering it at read time would hide it from every other consumer.
CREATE OR REPLACE VIEW mgh_shared_metric_infusion_facts_incl_unknown_room_v AS
SELECT DISTINCT ON (COALESCE(inf.medication_order_id, inf.id),
                    COALESCE(inf.medication_identifier, 'UNKNOWN'))
       inf.id                                                                            AS infusion_admin_id,
       inf.earliest_documented_event_date                                                AS event_time_utc,
       DATE_TRUNC('day', timezone('US/Eastern', to_timestamp(extract(epoch from inf.earliest_documented_event_date))))::date   AS event_date_est,
       DATE_TRUNC('month', timezone('US/Eastern', to_timestamp(extract(epoch from inf.earliest_documented_event_date))))::date AS month_start_est,
       op.evaluation_mode,
       inf.operation_id,
       inf.tracking_id,
       op.start_time                                                                     AS operation_start_time_utc,
       DATE_TRUNC('day', timezone('US/Eastern', to_timestamp(extract(epoch from op.start_time))))::date   AS operation_start_date_est,
       op.end_time                                                                       AS operation_end_time_utc,
       op.operating_room_name,
       COALESCE(inf.medication_identifier, 'UNKNOWN')                                    AS medication_identifier,
       inf.source_type,
       inf.documenting_practitioner_id,
       COALESCE(doc_prac.role, primary_prac.role)                                        AS documenting_practitioner_role,
       op.room_known
FROM "mgb-mgh".mgh_active_infusion_medication_administrations inf
         INNER JOIN "mgb-mgh".mgh_shared_metric_operations_incl_unknown_room_v op
                    ON op.operation_id = inf.operation_id
         LEFT JOIN "mgb-mgh".practitioners doc_prac ON doc_prac.id = inf.documenting_practitioner_id
         LEFT JOIN "mgb-mgh".practitioners primary_prac ON primary_prac.id = op.primary_practitioner_id
WHERE inf.earliest_documented_event_date >= op.start_time
  AND inf.earliest_documented_event_date <= op.end_time
  AND (
        (op.evaluation_mode = 'INTERACTIVE' AND inf.source_type IN ('EMR', 'APPLICATION'))
        OR (op.evaluation_mode = 'SILENT' AND inf.source_type = 'EMR')
    )
-- A null order id falls back to the row's own id so unrelated infusions are never collapsed together.
ORDER BY COALESCE(inf.medication_order_id, inf.id),
         COALESCE(inf.medication_identifier, 'UNKNOWN'),
         inf.earliest_documented_event_date,
         inf.latest_documented_event_date DESC NULLS LAST,
         inf.id;


-- Room-known subset, and the only infusion view a published metric should read.
CREATE OR REPLACE VIEW mgh_shared_metric_infusion_facts_v AS
SELECT infusion_admin_id,
       event_time_utc,
       event_date_est,
       month_start_est,
       evaluation_mode,
       operation_id,
       tracking_id,
       operation_start_time_utc,
       operation_start_date_est,
       operation_end_time_utc,
       operating_room_name,
       medication_identifier,
       source_type,
       documenting_practitioner_id,
       documenting_practitioner_role
FROM "mgb-mgh".mgh_shared_metric_infusion_facts_incl_unknown_room_v
WHERE room_known;


-- Unified event stream for ad-hoc querying.
-- FIRING rows populate firing_id; MED_ADMIN rows populate med_admin_id.
-- Bolus administrations only. Join mgh_shared_metric_infusion_facts_v for infusions; keeping them
-- out is what lets them enter the denominator without changing any query already written here.
CREATE OR REPLACE VIEW mgh_shared_metric_atomic_events_v AS
SELECT 'FIRING'::text        AS event_type,
       ff.event_time_utc,
       ff.event_date_est,
       ff.month_start_est,
       ff.evaluation_mode,
       ff.operation_id,
       ff.tracking_id,
       ff.firing_id,
       NULL::uuid             AS med_admin_id,
       ff.rule_identifier,
       ff.rule_bucket,
       ff.medication_identifier,
       ff.operating_room_name,
       ff.resolved_practitioner_role AS practitioner_role,
       ff.non_compliant_count,
       ff.is_firing_denominator,
       FALSE                  AS is_med_admin_denominator
FROM "mgb-mgh".mgh_shared_metric_firing_facts_v ff
UNION ALL
SELECT 'MED_ADMIN'::text     AS event_type,
       ma.event_time_utc,
       ma.event_date_est,
       ma.month_start_est,
       ma.evaluation_mode,
       ma.operation_id,
       ma.tracking_id,
       NULL::uuid             AS firing_id,
       ma.med_admin_id,
       NULL::text             AS rule_identifier,
       NULL::text             AS rule_bucket,
       ma.medication_identifier,
       ma.operating_room_name,
       COALESCE(ma.documenting_practitioner_role, 'UNKNOWN') AS practitioner_role,
       0                      AS non_compliant_count,
       FALSE                  AS is_firing_denominator,
       TRUE                   AS is_med_admin_denominator
FROM "mgb-mgh".mgh_shared_metric_med_admin_facts_v ma;

-- ============================================================
-- Materialized rollups
-- ============================================================

-- Firing-only daily rollup: powers non-follow metrics and the error-rate numerator.
CREATE MATERIALIZED VIEW mgh_shared_metric_firing_daily_rollup_mv AS
SELECT ff.event_date_est,
       ff.month_start_est,
       ff.operation_start_date_est,
       ff.evaluation_mode,
       ff.rule_bucket,
       ff.rule_identifier,
       ff.medication_identifier,
       ff.resolved_practitioner_role                AS practitioner_role,
       COUNT(*)::bigint                             AS firing_count,
       SUM(ff.non_compliant_count)::bigint          AS non_compliant_firing_count,
       SUM(ff.overridden_count)::bigint             AS overridden_firing_count
FROM "mgb-mgh".mgh_shared_metric_firing_facts_v ff
GROUP BY ff.event_date_est,
         ff.month_start_est,
         ff.operation_start_date_est,
         ff.evaluation_mode,
         ff.rule_bucket,
         ff.rule_identifier,
         ff.medication_identifier,
         ff.resolved_practitioner_role;

-- Med-admin-only daily rollup: powers the error-rate denominator.
CREATE MATERIALIZED VIEW mgh_shared_metric_med_admin_daily_rollup_mv AS
SELECT ma.event_date_est,
       ma.month_start_est,
       ma.operation_start_date_est,
       ma.evaluation_mode,
       ma.medication_identifier,
       COALESCE(ma.documenting_practitioner_role, 'UNKNOWN') AS practitioner_role,
       COUNT(*)::bigint                                       AS med_admin_count
FROM "mgb-mgh".mgh_shared_metric_med_admin_facts_v ma
GROUP BY ma.event_date_est,
         ma.month_start_est,
         ma.operation_start_date_est,
         ma.evaluation_mode,
         ma.medication_identifier,
         COALESCE(ma.documenting_practitioner_role, 'UNKNOWN');

-- Infusion-only daily rollup. Same grain and column names as the med-admin rollup so the two union
-- as-is.
CREATE MATERIALIZED VIEW mgh_shared_metric_infusion_daily_rollup_mv AS
SELECT inf.event_date_est,
       inf.month_start_est,
       inf.operation_start_date_est,
       inf.evaluation_mode,
       inf.medication_identifier,
       COALESCE(inf.documenting_practitioner_role, 'UNKNOWN') AS practitioner_role,
       COUNT(*)::bigint                                       AS infusion_admin_count
FROM "mgb-mgh".mgh_shared_metric_infusion_facts_v inf
GROUP BY inf.event_date_est,
         inf.month_start_est,
         inf.operation_start_date_est,
         inf.evaluation_mode,
         inf.medication_identifier,
         COALESCE(inf.documenting_practitioner_role, 'UNKNOWN');

-- ============================================================
-- Combined denominator
-- ============================================================

-- Both halves of the error-rate denominator, tagged by admin_type. Read unfiltered to count
-- infusions; add `WHERE admin_type = 'BOLUS'` to exclude them, which reproduces
-- mgh_shared_metric_med_admin_daily_rollup_mv exactly. Nothing counts infusions until a query
-- names this view, so existing reports are unaffected.
-- A plain view rather than a third materialized one: materializing would duplicate the bolus rows
-- and add a refresh that can fall behind the other two, and UNION ALL already pushes the date and
-- mode predicates into both rollups' indexes.
CREATE OR REPLACE VIEW mgh_shared_metric_denominator_daily_rollup_v AS
SELECT event_date_est,
       month_start_est,
       operation_start_date_est,
       evaluation_mode,
       'BOLUS'::text AS admin_type,
       medication_identifier,
       practitioner_role,
       med_admin_count AS admin_count
FROM "mgb-mgh".mgh_shared_metric_med_admin_daily_rollup_mv
UNION ALL
SELECT event_date_est,
       month_start_est,
       operation_start_date_est,
       evaluation_mode,
       'INFUSION'::text,
       medication_identifier,
       practitioner_role,
       infusion_admin_count
FROM "mgb-mgh".mgh_shared_metric_infusion_daily_rollup_mv;

-- ============================================================
-- Indexes on materialized views
-- ============================================================

CREATE INDEX idx_mgh_shared_metric_firing_daily_rollup_mv_date_mode
    ON mgh_shared_metric_firing_daily_rollup_mv (event_date_est, evaluation_mode);

CREATE INDEX idx_mgh_shared_metric_firing_daily_rollup_mv_month_mode
    ON mgh_shared_metric_firing_daily_rollup_mv (month_start_est, evaluation_mode);

CREATE INDEX idx_mgh_shared_metric_firing_daily_rollup_mv_operation_start_mode
    ON mgh_shared_metric_firing_daily_rollup_mv (operation_start_date_est, evaluation_mode);

CREATE INDEX idx_mgh_shared_metric_firing_daily_rollup_mv_mode_bucket_date
    ON mgh_shared_metric_firing_daily_rollup_mv (evaluation_mode, rule_bucket, event_date_est);

CREATE INDEX idx_mgh_shared_metric_firing_daily_rollup_mv_rule_date
    ON mgh_shared_metric_firing_daily_rollup_mv (rule_identifier, event_date_est);

CREATE INDEX idx_mgh_shared_metric_firing_daily_rollup_mv_practitioner_date
    ON mgh_shared_metric_firing_daily_rollup_mv (practitioner_role, event_date_est);

CREATE INDEX idx_mgh_shared_metric_med_admin_daily_rollup_mv_date_mode
    ON mgh_shared_metric_med_admin_daily_rollup_mv (event_date_est, evaluation_mode);

CREATE INDEX idx_mgh_shared_metric_med_admin_daily_rollup_mv_month_mode
    ON mgh_shared_metric_med_admin_daily_rollup_mv (month_start_est, evaluation_mode);

CREATE INDEX idx_mgh_shared_metric_med_admin_daily_rollup_mv_operation_start_mode
    ON mgh_shared_metric_med_admin_daily_rollup_mv (operation_start_date_est, evaluation_mode);

CREATE INDEX idx_mgh_shared_metric_med_admin_daily_rollup_mv_medication_date
    ON mgh_shared_metric_med_admin_daily_rollup_mv (medication_identifier, event_date_est);

CREATE INDEX idx_mgh_shared_metric_med_admin_daily_rollup_mv_practitioner_date
    ON mgh_shared_metric_med_admin_daily_rollup_mv (practitioner_role, event_date_est);

CREATE INDEX idx_mgh_shared_metric_infusion_daily_rollup_mv_date_mode
    ON mgh_shared_metric_infusion_daily_rollup_mv (event_date_est, evaluation_mode);

CREATE INDEX idx_mgh_shared_metric_infusion_daily_rollup_mv_month_mode
    ON mgh_shared_metric_infusion_daily_rollup_mv (month_start_est, evaluation_mode);

CREATE INDEX idx_mgh_shared_metric_infusion_daily_rollup_mv_operation_start_mode
    ON mgh_shared_metric_infusion_daily_rollup_mv (operation_start_date_est, evaluation_mode);

CREATE INDEX idx_mgh_shared_metric_infusion_daily_rollup_mv_medication_date
    ON mgh_shared_metric_infusion_daily_rollup_mv (medication_identifier, event_date_est);

CREATE INDEX idx_mgh_shared_metric_infusion_daily_rollup_mv_practitioner_date
    ON mgh_shared_metric_infusion_daily_rollup_mv (practitioner_role, event_date_est);
