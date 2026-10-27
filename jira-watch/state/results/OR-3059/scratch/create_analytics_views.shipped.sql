-- Single entry point to (re)create all Mayo analytics views and materialized views.
-- Run this file end-to-end to rebuild everything from scratch.
--
-- Mayo is a two-hospital tenant. Every layer carries a `facility` column so a report can
-- filter to one hospital or aggregate across both by summing facility rows.
--
-- Facility is derived from the building code embedded in the Epic room record name rather
-- than from a hardcoded room list, so new rooms in a known building classify themselves.
-- Rooms are keyed by the raw name.
--
--   RM OR 107 ROMB 01 528
--   ^^ ^^ ^^^ ^^^^ ^^ ^^^
--   |  |  |   |    |  +-- room/location suffix
--   |  |  |   |    +----- floor
--   |  |  |   +---------- building code -> facility
--   |  |  +-------------- OR number (not unique, even within a building; cardiac flag only)
--   |  +----------------- service (OR)
--   +-------------------- record type (room)
--
-- Metrics cover closed cases only (both start_time and end_time present), matching MGB.
--
-- Dependency order:
--   1. mayo_operation_rooms_v (room name -> building/facility classification, cardiac and excluded flags)
--   2. mayo_operations (every operation, facility attached, cardiac and excluded rooms removed)
--   3. mayo_rule_fired_results (firing view)
--   4. mayo_active_medication_administrations, mayo_active_infusion_medication_administrations
--   5. mayo_shared_metric_operations_v (metric cohort: adult, room-known, closed)
--   6. mayo_shared_metric_rule_scope_v (rule classification)
--   7. mayo_shared_metric_firing_facts_v, mayo_shared_metric_med_admin_facts_v (canonical facts)
--   8. mayo_shared_metric_atomic_events_v (unified event stream)
--   9. mayo_shared_metric_firing_daily_rollup_mv, mayo_shared_metric_med_admin_daily_rollup_mv
--  10. Indexes on materialized views
--  11. Refresh role grants

SET search_path TO "mayo-mayo";

-- ============================================================
-- Drop everything in reverse dependency order
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS mayo_shared_metric_firing_daily_rollup_mv;
DROP MATERIALIZED VIEW IF EXISTS mayo_shared_metric_med_admin_daily_rollup_mv;
-- Detail views, dropped and not recreated. Nothing in this directory reads them, and they read
-- the facts and cohort views below, so a plain DROP of those fails while one still exists.
-- The drops stay for a database that still carries them, as the retired names here do.
DROP VIEW IF EXISTS mayo_medication_details_v;
DROP VIEW IF EXISTS mayo_operation_procedure_categories_v;
DROP VIEW IF EXISTS mayo_operation_procedure_identifiers_v;
DROP VIEW IF EXISTS mayo_noncompliant_firings_v;
DROP VIEW IF EXISTS mayo_operation_details_v;
DROP VIEW IF EXISTS mayo_shared_metric_atomic_events_v;
DROP VIEW IF EXISTS mayo_shared_metric_med_admin_facts_v;
DROP VIEW IF EXISTS mayo_shared_metric_firing_facts_v;
DROP VIEW IF EXISTS mayo_shared_metric_rule_scope_v;
DROP VIEW IF EXISTS mayo_shared_metric_operations_v;
DROP VIEW IF EXISTS mayo_active_medication_administrations;
DROP VIEW IF EXISTS mayo_active_infusion_medication_administrations;
DROP VIEW IF EXISTS mayo_rule_fired_results;
DROP VIEW IF EXISTS mayo_operations;
DROP VIEW IF EXISTS mayo_operation_rooms_v;

-- ============================================================
-- Room / facility classification
-- ============================================================

-- One row per distinct room name observed in operations, with its parsed building code and
-- facility. This is the single source of truth for the facility split and for the room
-- exclusions; every other view reaches it through mayo_operations.
--
-- The room itself is always identified by the raw operating_room_name, which is the only
-- reliable key: Epic carries two distinct OR 30 records in the Eisenberg building, so a room
-- number is not unique even within a building. The OR number is parsed only to flag the
-- cardiac rooms, where covering every record that carries a number is what is wanted.
--
-- Also the audit surface: SELECT * WHERE facility = 'UNKNOWN' to find building codes Mayo
-- has added since this file was last updated. Unmapped buildings stay visible as UNKNOWN
-- instead of being silently attributed to the wrong hospital.
CREATE OR REPLACE VIEW mayo_operation_rooms_v AS
WITH distinct_names AS (
    SELECT DISTINCT o.operating_room_name
    FROM "mayo-mayo".operations o
    WHERE o.operating_room_name IS NOT NULL
),
     -- Room records Epic files under the OR service that are not real operating rooms, so the
     -- cases they carry are not OR cases.
     excluded_rooms(operating_room_name) AS (
         VALUES ('RM OR BEDSIDE ROMB 01')
     ),
     parsed AS (
         SELECT n.operating_room_name,
                substring(n.operating_room_name FROM '\yRO[A-Z]{2}\y') AS building_code,
                substring(n.operating_room_name FROM '\yOR (\d+)\y')   AS or_number
         FROM distinct_names n
     )
SELECT p.operating_room_name,
       p.building_code,
       CASE p.building_code
           WHEN 'ROEI' THEN 'METHODIST'   -- Eisenberg Building
           WHEN 'ROJB' THEN 'METHODIST'   -- Joseph Building
           WHEN 'ROMB' THEN 'SAINT_MARYS' -- Mary Brigh Building
           ELSE 'UNKNOWN'
       END AS facility,
       -- Cardiac rooms at Saint Marys, out of scope. Matched on OR number and building code
       -- rather than room name: ten of the fifteen have never sent a case, so their name suffix
       -- is unknown, and the number covers every Epic record carrying it. The ROMB gate is what
       -- keeps Methodist out; it runs its own OR 50-56, 60-64 and 80-87.
       p.building_code = 'ROMB'
           AND COALESCE(p.or_number, '') IN ('508', '509', '510',
                                             '601', '602', '603', '604', '605',
                                             '606', '607', '608', '609',
                                             '801', '802', '803') AS cardiac,
       p.operating_room_name IN (SELECT operating_room_name FROM excluded_rooms) AS excluded
FROM parsed p;

-- ============================================================
-- Base views
-- ============================================================

-- Every operation Mayo has sent, with its facility attached and the cardiac and excluded rooms
-- removed. The widest population any Mayo report may read, and the only place the room exclusions
-- are applied: a report reaching past this view to "mayo-mayo".operations gets those rooms back.
--
-- Every rule that narrows the reportable population lives in mayo_shared_metric_operations_v
-- instead, so this view is the full record and that one is the cohort. The volume reports read
-- this view and count pediatric and room-less cases on purpose, because a report that quietly
-- withheld part of the day would understate volume without saying so.
--
-- LEFT JOIN, then COALESCE: the room map is keyed on a non-null room name, so an inner join
-- would drop a case whose room name never arrived rather than give it UNKNOWN.
--
-- Patients listed in withheld_patients are removed here at the client's request, so no Mayo
-- report can count them.
CREATE OR REPLACE VIEW mayo_operations AS
WITH withheld_patients(patient_id) AS (
    VALUES ('01a01063-bfbb-779d-b9b9-cd43dc746578'::uuid)
)
SELECT p.pmrn,
       o.case_id,
       o.operating_room_name,
       COALESCE(r.facility, 'UNKNOWN')      AS facility,
       r.building_code,
       o.start_time,
       o.end_time,
       o.pediatric_status,
       o.evaluation_mode,
       o.acuity,
       o.id                                 AS operation_id,
       p.id                                 AS patient_id,
       o.primary_practitioner_id
FROM "mayo-mayo".operations o
         JOIN "mayo-mayo".patients p ON p.id = o.patient_id
         LEFT JOIN "mayo-mayo".mayo_operation_rooms_v r
                   ON r.operating_room_name = o.operating_room_name
WHERE NOT COALESCE(r.cardiac OR r.excluded, FALSE)
  AND p.id NOT IN (SELECT patient_id FROM withheld_patients);


-- Firings joined to their operation.
--
-- Base view, so it spans open and closed cases alike and is the right place to debug from.
-- The [start_time, end_time] window is a defensive filter that discards events falling
-- outside the case; operation_id already establishes attribution. Mayo delivers case-start
-- and case-stop timing events independently, so an operation can carry one bound or
-- neither, and each bound is applied only where it exists. Closed cases are the metric
-- layer's rule to state, not this view's: mayo_shared_metric_operations_v requires both
-- bounds, and this view stays wide so a half-open case can still be reconciled from here.
--
-- The upper bound compares created_date, when the firing row was written, against a case bound
-- taken off a documented clinical timestamp. Those are two different clocks, separated by the
-- delivery and processing lag, so a firing riding the event that closes the case would be
-- discarded by construction. NOTIFICATION firings are therefore exempt from it: operation_id
-- already establishes attribution, and their created_date is a processing artifact rather than a
-- clinical time. The trigger is read from the firing itself, which carries the value stamped when
-- the rule fired, so the exemption does not depend on the current rule catalog.
--
-- Timer-driven firings keep the bound. That is what discards reminders still firing hours after
-- the case closed, which is a real position in the case rather than a clock artifact.
CREATE OR REPLACE VIEW mayo_rule_fired_results AS
SELECT rfr.evaluation_mode,
       rec.tracking_id,
       rec.operation_id,
       rec.user_id                                                               AS evaluating_user_id,
       rec.evaluating_practitioner_id,
       o.operating_room_name,
       o.facility,
       o.building_code,
       o.evaluation_mode                                                         AS operation_evaluation_mode,
       rfr.id,
       rfr.rule_identifier,
       rfr.created_date,
       rfr.details,
       rfr.prompt,
       rfr.accepted,
       rfr.rejection_reason,
       rfr.rejection_reason_comment,
       rfr.responder_id,
       COALESCE(evaluating_practitioner.name, u.username, 'UNKNOWN')             AS evaluating_practitioner_name,
       COALESCE(evaluating_practitioner.role, user_practitioner.role, 'UNKNOWN') AS evaluating_practitioner_role,
       rfr.trigger                                                               AS rule_trigger
FROM "mayo-mayo".rule_execution_contexts rec
         INNER JOIN "mayo-mayo".rule_fired_results rfr ON rfr.rule_execution_context_id = rec.id
         INNER JOIN "mayo-mayo".mayo_operations o ON o.operation_id = rec.operation_id
         LEFT JOIN "mayo-mayo".practitioners evaluating_practitioner
                   ON evaluating_practitioner.id = rec.evaluating_practitioner_id
         LEFT JOIN "public".users u ON u.id = rec.user_id
         LEFT JOIN "mayo-mayo".practitioners user_practitioner ON user_practitioner.user_id = u.id
WHERE (o.start_time IS NULL OR rfr.created_date >= o.start_time)
  AND (o.end_time IS NULL OR rfr.created_date <= o.end_time OR rfr.trigger = 'NOTIFICATION');


-- Active (non-soft-deleted) medication administrations.
-- Analytics queries should always read from these views instead of the raw tables so
-- soft-deleted rows are excluded by default. The COALESCE handles rows from before
-- the `deleted` column existed (NULL means not deleted).
CREATE OR REPLACE VIEW mayo_active_medication_administrations AS
SELECT *
FROM "mayo-mayo".medication_administrations
WHERE COALESCE(deleted, false) = false;

CREATE OR REPLACE VIEW mayo_active_infusion_medication_administrations AS
SELECT *
FROM "mayo-mayo".infusion_medication_administrations
WHERE COALESCE(deleted, false) = false;


-- ============================================================
-- Shared metric layer
-- ============================================================

-- Metric cohort. Mayo runs both modes in every room, so mode is read off the operation
-- rather than inferred from a per-mode room list.
--
-- Closed cases only, matching MGB. A case with no start or no stop has an open-ended window,
-- so its firing and administration counts are still accumulating and any rate computed over
-- it is a rate over a partial denominator. Requiring both bounds keeps every metric period
-- final once it is reported.
--
-- Mayo populates these timestamps from independently delivered timing events, so this gate
-- is materially stricter than it looks: operations missing a bound drop out of every metric
-- while remaining visible in mayo_operations for reconciliation.
--
-- Every location Epic files under the OR service is in scope, less the rooms mayo_operations removes.
-- Pediatric operations and operations with no room name are dropped here rather than in
-- mayo_operations, so that one view holds every rule separating the cohort from the full record
-- and a report cannot inherit half of them. The cardiac and excluded rooms are the exception and
-- are already gone from mayo_operations, because no Mayo report should count them at all.
CREATE OR REPLACE VIEW mayo_shared_metric_operations_v AS
SELECT *
FROM "mayo-mayo".mayo_operations
WHERE evaluation_mode IN ('INTERACTIVE', 'SILENT')
  AND pediatric_status = 'ADULT'                  -- matching MGH cohort policy (OR-2196)
  AND operating_room_name IS NOT NULL
  AND start_time IS NOT NULL
  AND end_time IS NOT NULL;


-- Rule normalization:
-- - rule_bucket drives breakout rows.
-- - in_metric_scope determines which firings feed error/non-follow metrics.
--
-- Category membership is tested with the jsonb ?| ("has any of these elements") operator rather
-- than EXISTS over json_array_elements_text. The EXISTS form compiles to one correlated subplan
-- per category, each re-expanding a rule's category array to answer a single membership
-- question. As plain scalar expressions the whole view is a filter over one scan of the rule
-- catalog, with no subplans at all.
--
-- Deliberately a plain view. Materializing it would buy a refresh-ordering dependency:
-- rule_definitions changes would not reach any metric until someone remembered to refresh, and
-- a forgotten refresh misclassifies rules silently.
CREATE OR REPLACE VIEW mayo_shared_metric_rule_scope_v AS
WITH category_flags AS (
    SELECT rd.id AS rule_identifier,
           -- categories is nullable, and ?| yields NULL rather than false on a NULL input.
           -- COALESCE keeps these strictly boolean so in_metric_scope cannot go three-valued.
           (rd.id LIKE 'a-%')                                                        AS is_alert,
           COALESCE(rd.categories::jsonb ?| ARRAY['COMPLIANCE_SINGLE_MAX_DOSE',
                                                  'COMPLIANCE_CUMULATIVE_MAX_DOSE'],
                    false)                                                           AS is_max_dose,
           COALESCE(rd.categories::jsonb ?| ARRAY['COMPLIANCE_DEFAULT_DOSE'],
                    false)                                                           AS is_default_dose,
           COALESCE(rd.categories::jsonb ?| ARRAY['COMPLIANCE_SINGLE_MIN_DOSE'],
                    false)                                                           AS is_min_dose,
           COALESCE(rd.categories::jsonb ?| ARRAY['COMPLIANCE_MEDICATION_ADMINISTERED',
                                                  'COMPLIANCE_MEDICATION_NOT_ADMINISTERED'],
                    false)                                                           AS is_med_admin
    FROM "mayo-mayo".rule_definitions rd
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
-- One mode axis, enforced by joining the operation on evaluation_mode as well as id. A case
-- launched interactively after running silently keeps its earlier SILENT rule executions, so
-- the firing's mode and the case's mode can differ; a firing whose mode differs from its case
-- is not a fact about either mode's population and is left out of the metric layer entirely.
-- mayo_rule_fired_results still carries both, and is where such a firing is found.
--
-- The join is what makes the mode column unambiguous downstream: every row here was evaluated
-- under the mode its case is in, so a report cannot pick the wrong axis. It matches
-- mgh_shared_metric_firing_facts_v, so "INTERACTIVE error rate" means the same population at
-- both sites.
--
-- Practitioner role resolves in order:
--   a) the operation's primary practitioner, for a firing an HL7 event triggered
--   b) evaluating_practitioner_id from rule_execution_context
--   c) documenting practitioner by operation_id + tracking_id (fallback when evaluating practitioner is missing)
--   d) the operation's primary practitioner
--
-- A NOTIFICATION firing takes (a) because no one evaluated it. What such a firing names is a property
-- of the message that carried the event: an OR timing firing names the anesthesia clinician on that
-- message's AIP roster, or nobody when the roster staffs none, and a firing an observation triggered
-- (glucose, EBL) names nobody at all. The case's primary practitioner is the one clinician every
-- NOTIFICATION firing can be read against, taken from the AIP roster at the first case-start
-- milestone, so (a) answers the question the role dimension is read to ask on all of them alike:
-- whose care does this non-compliance belong to.
CREATE OR REPLACE VIEW mayo_shared_metric_firing_facts_v AS
WITH compliance_summary AS (
    SELECT cr.rule_fired_result_id AS firing_id,
           COUNT(*) FILTER (WHERE cr.compliant = FALSE) AS non_compliant_result_count
    FROM "mayo-mayo".compliance_results cr
    GROUP BY cr.rule_fired_result_id
),
     documenting_role_by_tracking AS (
         SELECT ma.operation_id,
                ma.tracking_id,
                MAX(doc_prac.role) AS documenting_practitioner_role
         FROM "mayo-mayo".mayo_active_medication_administrations ma
                  LEFT JOIN "mayo-mayo".practitioners doc_prac ON doc_prac.id = ma.documenting_practitioner_id
         WHERE ma.tracking_id IS NOT NULL
         GROUP BY ma.operation_id, ma.tracking_id
     )
SELECT rfr.id                                                                              AS firing_id,
       rfr.created_date                                                                    AS event_time_utc,
       DATE_TRUNC('day', timezone('US/Central', to_timestamp(extract(epoch from rfr.created_date))))::date   AS event_date_local,
       DATE_TRUNC('month', timezone('US/Central', to_timestamp(extract(epoch from rfr.created_date))))::date AS month_start_local,
       rfr.evaluation_mode,
       rfr.operation_id,
       rfr.tracking_id,
       op.facility,
       op.building_code,
       op.operating_room_name,
       op.start_time                                                                       AS operation_start_time_utc,
       DATE_TRUNC('day', timezone('US/Central', to_timestamp(extract(epoch from op.start_time))))::date      AS operation_start_date_local,
       op.end_time                                                                         AS operation_end_time_utc,
       rfr.rule_identifier,
       COALESCE(scope.rule_bucket,
                CASE WHEN rfr.rule_identifier LIKE 'a-%' THEN 'alert' ELSE 'other' END)    AS rule_bucket,
       COALESCE(rfr.details ->> 'MEDICATION_IDENTIFIER',
                rfr.details ->> 'MEDICATION_ID',
                'UNKNOWN')                                                                 AS medication_identifier,
       rfr.accepted,
       rfr.evaluating_practitioner_id,
       COALESCE(eval_prac.name, rfr.evaluating_practitioner_name, 'UNKNOWN')               AS evaluating_practitioner_name,
       COALESCE(eval_prac.role, 'UNKNOWN')                                                 AS evaluating_practitioner_role,
       doc_role.documenting_practitioner_role,
       CASE
           WHEN rfr.rule_trigger = 'NOTIFICATION' THEN COALESCE(primary_prac.role, 'UNKNOWN')
           WHEN eval_prac.role IS NOT NULL THEN eval_prac.role
           WHEN rfr.evaluating_practitioner_id IS NULL
               AND rfr.tracking_id IS NOT NULL
               THEN COALESCE(doc_role.documenting_practitioner_role, primary_prac.role, 'UNKNOWN')
           ELSE COALESCE(primary_prac.role, 'UNKNOWN')
       END                                                                                  AS resolved_practitioner_role,
       -- Non-compliance count: number of non-compliant results per firing.
       -- Alerts produce 0 or 1; warnings can produce multiple (one per non-compliant compliance_result).
       -- compliance_results is the sole source of truth. A silent alert is stamped non-compliant when
       -- it fires and an interactive one when the practitioner rejects it, so both already land here.
       -- Rules claimed by an AlertComplianceOverride decide from the clinical record instead: an
       -- antibiotic redose reminder is compliant when the dose was given inside its window, and the
       -- ERAS antiemetics alert re-evaluates at anesthesia stop regardless of accept or reject.
       COALESCE(cs.non_compliant_result_count, 0)                                           AS non_compliant_count,
       -- Override count: the practitioner rejected the alert. Deliberately separate from
       -- non-compliance, which is a clinical verdict an AlertComplianceOverride evaluator can
       -- reach independently of what the practitioner pressed. A rejected antibiotic redose
       -- whose dose landed in-window is an override and not an error.
       CASE WHEN rfr.accepted = FALSE THEN 1 ELSE 0 END                                     AS overridden_count,
       TRUE                                                                                 AS is_firing_denominator,
       -- Last in the select list because CREATE OR REPLACE VIEW can only append columns.
       rfr.rule_trigger
FROM "mayo-mayo".mayo_rule_fired_results rfr
         INNER JOIN "mayo-mayo".mayo_shared_metric_operations_v op
                    ON op.operation_id = rfr.operation_id
                        AND op.evaluation_mode = rfr.evaluation_mode
         LEFT JOIN "mayo-mayo".mayo_shared_metric_rule_scope_v scope ON scope.rule_identifier = rfr.rule_identifier
         LEFT JOIN "mayo-mayo".practitioners eval_prac ON eval_prac.id = rfr.evaluating_practitioner_id
         LEFT JOIN compliance_summary cs ON cs.firing_id = rfr.id
         LEFT JOIN documenting_role_by_tracking doc_role
                   ON doc_role.operation_id = rfr.operation_id
                       AND doc_role.tracking_id = rfr.tracking_id
         LEFT JOIN "mayo-mayo".practitioners primary_prac ON primary_prac.id = op.primary_practitioner_id
WHERE COALESCE(scope.in_metric_scope, rfr.rule_identifier LIKE 'a-%');


-- Canonical med-admin facts for the error-rate denominator.
-- Mode-specific source_type policy is enforced here, keyed on the operation's mode since
-- an administration carries no execution context of its own:
-- - INTERACTIVE: source_type IN ('EMR', 'APPLICATION')
-- - SILENT: source_type = 'EMR'
CREATE OR REPLACE VIEW mayo_shared_metric_med_admin_facts_v AS
SELECT ma.id                                                                                        AS med_admin_id,
       ma.administration_date                                                                       AS event_time_utc,
       DATE_TRUNC('day', timezone('US/Central', to_timestamp(extract(epoch from ma.administration_date))))::date      AS event_date_local,
       DATE_TRUNC('month', timezone('US/Central', to_timestamp(extract(epoch from ma.administration_date))))::date    AS month_start_local,
       op.evaluation_mode,
       ma.operation_id,
       ma.tracking_id,
       op.facility,
       op.building_code,
       op.operating_room_name,
       op.start_time                                                                                AS operation_start_time_utc,
       DATE_TRUNC('day', timezone('US/Central', to_timestamp(extract(epoch from op.start_time))))::date               AS operation_start_date_local,
       op.end_time                                                                                  AS operation_end_time_utc,
       COALESCE(ma.medication_identifier, 'UNKNOWN')                                                AS medication_identifier,
       ma.source_type,
       ma.documenting_practitioner_id,
       COALESCE(doc_prac.role, primary_prac.role)                                                   AS documenting_practitioner_role
FROM "mayo-mayo".mayo_active_medication_administrations ma
         INNER JOIN "mayo-mayo".mayo_shared_metric_operations_v op ON op.operation_id = ma.operation_id
         LEFT JOIN "mayo-mayo".practitioners doc_prac ON doc_prac.id = ma.documenting_practitioner_id
         LEFT JOIN "mayo-mayo".practitioners primary_prac ON primary_prac.id = op.primary_practitioner_id
WHERE ma.administration_date >= op.start_time
  AND ma.administration_date <= op.end_time
  AND (
        (op.evaluation_mode = 'INTERACTIVE' AND ma.source_type IN ('EMR', 'APPLICATION'))
        OR (op.evaluation_mode = 'SILENT' AND ma.source_type = 'EMR')
    );


-- Unified event stream for ad-hoc querying.
-- FIRING rows populate firing_id; MED_ADMIN rows populate med_admin_id.
CREATE OR REPLACE VIEW mayo_shared_metric_atomic_events_v AS
SELECT 'FIRING'::text        AS event_type,
       ff.event_time_utc,
       ff.event_date_local,
       ff.month_start_local,
       ff.evaluation_mode,
       ff.operation_id,
       ff.tracking_id,
       ff.firing_id,
       NULL::uuid             AS med_admin_id,
       ff.facility,
       ff.building_code,
       ff.operating_room_name,
       ff.rule_identifier,
       ff.rule_bucket,
       ff.medication_identifier,
       ff.resolved_practitioner_role AS practitioner_role,
       ff.non_compliant_count,
       ff.is_firing_denominator,
       FALSE                  AS is_med_admin_denominator
FROM "mayo-mayo".mayo_shared_metric_firing_facts_v ff
UNION ALL
SELECT 'MED_ADMIN'::text     AS event_type,
       ma.event_time_utc,
       ma.event_date_local,
       ma.month_start_local,
       ma.evaluation_mode,
       ma.operation_id,
       ma.tracking_id,
       NULL::uuid             AS firing_id,
       ma.med_admin_id,
       ma.facility,
       ma.building_code,
       ma.operating_room_name,
       NULL::text             AS rule_identifier,
       NULL::text             AS rule_bucket,
       ma.medication_identifier,
       COALESCE(ma.documenting_practitioner_role, 'UNKNOWN') AS practitioner_role,
       0                      AS non_compliant_count,
       FALSE                  AS is_firing_denominator,
       TRUE                   AS is_med_admin_denominator
FROM "mayo-mayo".mayo_shared_metric_med_admin_facts_v ma;

-- ============================================================
-- Materialized rollups
-- ============================================================

-- facility is a grouping key rather than a filter, so per-hospital reports select a facility
-- and system-wide reports sum across facilities, both off the same rollup.

-- Firing-only daily rollup: powers non-follow metrics and the error-rate numerator.
CREATE MATERIALIZED VIEW mayo_shared_metric_firing_daily_rollup_mv AS
SELECT ff.event_date_local,
       ff.month_start_local,
       ff.operation_start_date_local,
       ff.facility,
       ff.evaluation_mode,
       ff.rule_bucket,
       ff.rule_identifier,
       ff.medication_identifier,
       ff.resolved_practitioner_role                AS practitioner_role,
       COUNT(*)::bigint                             AS firing_count,
       SUM(ff.non_compliant_count)::bigint          AS non_compliant_firing_count,
       SUM(ff.overridden_count)::bigint             AS overridden_firing_count
FROM "mayo-mayo".mayo_shared_metric_firing_facts_v ff
GROUP BY ff.event_date_local,
         ff.month_start_local,
         ff.operation_start_date_local,
         ff.facility,
         ff.evaluation_mode,
         ff.rule_bucket,
         ff.rule_identifier,
         ff.medication_identifier,
         ff.resolved_practitioner_role;

-- Med-admin-only daily rollup: powers the error-rate denominator.
CREATE MATERIALIZED VIEW mayo_shared_metric_med_admin_daily_rollup_mv AS
SELECT ma.event_date_local,
       ma.month_start_local,
       ma.operation_start_date_local,
       ma.facility,
       ma.evaluation_mode,
       ma.medication_identifier,
       COALESCE(ma.documenting_practitioner_role, 'UNKNOWN') AS practitioner_role,
       COUNT(*)::bigint                                       AS med_admin_count
FROM "mayo-mayo".mayo_shared_metric_med_admin_facts_v ma
GROUP BY ma.event_date_local,
         ma.month_start_local,
         ma.operation_start_date_local,
         ma.facility,
         ma.evaluation_mode,
         ma.medication_identifier,
         COALESCE(ma.documenting_practitioner_role, 'UNKNOWN');

-- ============================================================
-- Indexes on materialized views
-- ============================================================

CREATE INDEX idx_mayo_firing_daily_rollup_mv_date_facility_mode
    ON mayo_shared_metric_firing_daily_rollup_mv (event_date_local, facility, evaluation_mode);

CREATE INDEX idx_mayo_firing_daily_rollup_mv_month_facility_mode
    ON mayo_shared_metric_firing_daily_rollup_mv (month_start_local, facility, evaluation_mode);

CREATE INDEX idx_mayo_firing_daily_rollup_mv_op_start_facility_mode
    ON mayo_shared_metric_firing_daily_rollup_mv (operation_start_date_local, facility, evaluation_mode);

CREATE INDEX idx_mayo_firing_daily_rollup_mv_facility_bucket_date
    ON mayo_shared_metric_firing_daily_rollup_mv (facility, rule_bucket, event_date_local);

CREATE INDEX idx_mayo_firing_daily_rollup_mv_rule_date
    ON mayo_shared_metric_firing_daily_rollup_mv (rule_identifier, event_date_local);

CREATE INDEX idx_mayo_firing_daily_rollup_mv_practitioner_date
    ON mayo_shared_metric_firing_daily_rollup_mv (practitioner_role, event_date_local);

CREATE INDEX idx_mayo_med_admin_daily_rollup_mv_date_facility_mode
    ON mayo_shared_metric_med_admin_daily_rollup_mv (event_date_local, facility, evaluation_mode);

CREATE INDEX idx_mayo_med_admin_daily_rollup_mv_month_facility_mode
    ON mayo_shared_metric_med_admin_daily_rollup_mv (month_start_local, facility, evaluation_mode);

CREATE INDEX idx_mayo_med_admin_daily_rollup_mv_op_start_facility_mode
    ON mayo_shared_metric_med_admin_daily_rollup_mv (operation_start_date_local, facility, evaluation_mode);

CREATE INDEX idx_mayo_med_admin_daily_rollup_mv_medication_date
    ON mayo_shared_metric_med_admin_daily_rollup_mv (medication_identifier, event_date_local);

CREATE INDEX idx_mayo_med_admin_daily_rollup_mv_practitioner_date
    ON mayo_shared_metric_med_admin_daily_rollup_mv (practitioner_role, event_date_local);

CREATE UNIQUE INDEX uq_mayo_firing_daily_rollup_mv
    ON mayo_shared_metric_firing_daily_rollup_mv
       (event_date_local, month_start_local, operation_start_date_local,
        facility, evaluation_mode, rule_bucket, rule_identifier,
        medication_identifier, practitioner_role) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX uq_mayo_med_admin_daily_rollup_mv
    ON mayo_shared_metric_med_admin_daily_rollup_mv
       (event_date_local, month_start_local, operation_start_date_local,
        facility, evaluation_mode, medication_identifier,
        practitioner_role) NULLS NOT DISTINCT;

-- ============================================================
-- Refresh role grants
-- ============================================================

-- Every matview in the schema is covered so a rollup added later needs no change here.
-- MAINTAIN is not granted schema-wide: on base tables it would also carry LOCK, VACUUM
-- and REINDEX over clinical data.
DO $$
DECLARE
    mv text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orci_analytics_refresh') THEN
        RAISE NOTICE 'role orci_analytics_refresh absent; skipping refresh grants';
        RETURN;
    END IF;

    GRANT USAGE ON SCHEMA "mayo-mayo" TO orci_analytics_refresh;

    FOR mv IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'mayo-mayo'
          AND c.relkind = 'm'
    LOOP
        EXECUTE format('GRANT MAINTAIN ON %I.%I TO orci_analytics_refresh', 'mayo-mayo', mv);
    END LOOP;
END
$$;
