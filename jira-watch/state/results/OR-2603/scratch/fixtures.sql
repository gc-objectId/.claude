SET search_path TO "mgb-mgh";

DELETE FROM compliance_results;
DELETE FROM rule_fired_results;
DELETE FROM rule_execution_contexts;
DELETE FROM medication_administrations;
DELETE FROM operations;
DELETE FROM patients;
DELETE FROM practitioners;

INSERT INTO practitioners (id, created_date, last_modified_date, epic_user_id, name, role) VALUES
  ('00000000-0000-0000-0000-0000000000d1', now(), now(), 'DOC1', 'Doc Documenting', 'Anesthesiologist'),
  ('00000000-0000-0000-0000-0000000000f1', now(), now(), 'PRI1', 'Pri Primary', 'CRNA');

-- one patient + one operation + one LA administration per scenario key
CREATE TEMP TABLE scen(k text, room text, mode text, admin_utc timestamp, doc boolean);
INSERT INTO scen VALUES
  ('A0','MGH OR 04','INTERACTIVE', timestamp '2025-12-31 20:00', true),
  ('A1','MGH OR 04','INTERACTIVE', timestamp '2026-01-01 03:00', true),
  ('A2','MGH OR 04','INTERACTIVE', timestamp '2026-01-01 06:00', true),
  ('A3','MGH OR 04','INTERACTIVE', timestamp '2026-04-01 02:00', true),
  ('A4','MGH OR 04','INTERACTIVE', timestamp '2026-04-01 05:00', true),
  ('B1','MGH OR 05','INTERACTIVE', timestamp '2026-02-10 15:00', true),
  ('B2','MGH OR 05','INTERACTIVE', timestamp '2026-02-10 16:00', false),
  ('B3','MGH OR 20','SILENT',      timestamp '2026-02-11 15:00', true),
  ('B4','MGH OR 05','INTERACTIVE', timestamp '2026-02-12 15:00', true);

INSERT INTO patients (id, created_date, last_modified_date, mrn, pmrn, first_name, last_name)
SELECT md5('pat'||k)::uuid, now(), now(), 'MRN-'||k, 'PMRN-'||k, 'Test', k FROM scen;

INSERT INTO operations (id, created_date, last_modified_date, patient_id, eras_operation,
                        case_id, operating_room_name, evaluation_mode, pediatric_status,
                        start_time, end_time, primary_practitioner_id)
SELECT md5('op'||k)::uuid, now(), now(), md5('pat'||k)::uuid, false,
       'CASE-'||k, room, mode, 'ADULT',
       admin_utc - interval '2 hours', admin_utc + interval '2 hours',
       '00000000-0000-0000-0000-0000000000f1'
FROM scen;

INSERT INTO medication_administrations (id, created_date, last_modified_date, patient_id, operation_id,
                                        medication_id, medication_identifier, medication_name,
                                        administration_date, dose_amount, dose_units, route,
                                        source_type, tracking_id, documenting_practitioner_id, deleted)
SELECT md5('ma'||k)::uuid, now(), now(), md5('pat'||k)::uuid, md5('op'||k)::uuid,
       '01a03572-715e-789f-84b9-3320cc4ba37f', 'g-exparel', 'EXPAREL 266 MG/20ML',
       admin_utc, 20, 'mL', 'INFILTRATION', 'EMR',
       md5('trk'||k)::uuid,
       CASE WHEN doc THEN '00000000-0000-0000-0000-0000000000d1'::uuid ELSE NULL END,
       false
FROM scen;

INSERT INTO rule_execution_contexts (id, created_date, last_modified_date, patient_id, operation_id,
                                     evaluation_mode, tracking_id, evaluating_practitioner_id)
SELECT md5('rec'||k)::uuid, admin_utc, now(), md5('pat'||k)::uuid, md5('op'||k)::uuid,
       mode, md5('trk'||k)::uuid, '00000000-0000-0000-0000-0000000000d1'
FROM scen WHERE k <> 'B2';

-- A0..A4 + B1: the SAVE alert. B1 rejected (non-compliant), the A-series accepted (compliant).
INSERT INTO rule_fired_results (id, created_date, last_modified_date, rule_identifier,
                                rule_execution_context_id, accepted, suppressed, suppression_allowed)
SELECT md5('rfr-save'||k)::uuid, admin_utc, now(), 'a-local-anesthetic-max-dose-save',
       md5('rec'||k)::uuid, (k <> 'B1'), false, false
FROM scen WHERE k LIKE 'A%' OR k = 'B1';

-- B3: SILENT scan alert -> non-compliant by mode
INSERT INTO rule_fired_results (id, created_date, last_modified_date, rule_identifier,
                                rule_execution_context_id, accepted, suppressed, suppression_allowed)
SELECT md5('rfr-scan'||k)::uuid, admin_utc, now(), 'a-local-anesthetic-max-dose-scan',
       md5('rec'||k)::uuid, NULL, false, false
FROM scen WHERE k = 'B3';

-- B4: warning, compliant
INSERT INTO rule_fired_results (id, created_date, last_modified_date, rule_identifier,
                                rule_execution_context_id, accepted, suppressed, suppression_allowed)
SELECT md5('rfr-warn'||k)::uuid, admin_utc, now(), 'w-last-local-anesthetic-max-dose',
       md5('rec'||k)::uuid, NULL, false, false
FROM scen WHERE k = 'B4';

INSERT INTO compliance_results (id, created_date, last_modified_date, label, rule_fired_result_id, compliant)
VALUES
  (md5('cr-B1')::uuid, now(), now(), 'LAST', md5('rfr-saveB1')::uuid, false),
  (md5('cr-B3')::uuid, now(), now(), 'LAST', md5('rfr-scanB3')::uuid, false),
  (md5('cr-B4')::uuid, now(), now(), 'LAST', md5('rfr-warnB4')::uuid, true);

DROP TABLE scen;
