SET search_path TO "mayo-mayo";
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO patient_observations (id, created_date, last_modified_date, patient_id, type, observation_value, observation_units, effective_time, deleted)
SELECT gen_random_uuid(), now(), now(), rec.patient_id, 'BODY_WEIGHT', '100', 'kg', now() - interval '1 day', false
FROM rule_execution_contexts rec WHERE rec.id = '01a1d17c-15c4-78c5-adab-393ff7e5dd68';
INSERT INTO rule_not_fired_results (id, created_date, last_modified_date, rule_identifier, rule_execution_context_id, details, explanation)
VALUES (gen_random_uuid(), now(), now(), 'a-antibiotic-early-redose', '01a1d17c-15c4-78c5-adab-393ff7e5dd68', '{"CRCL": 37.77567816840278}', 'staged for rescore validation');
INSERT INTO rule_execution_contexts (id, created_date, last_modified_date, patient_id, operation_id, user_id, evaluation_mode, tracking_id, weight_classification, weight_type, calculated_weight, evaluating_practitioner_id)
SELECT '22222222-2222-2222-2222-000000000004', created_date, now(), patient_id, operation_id, user_id, evaluation_mode, tracking_id, weight_classification, weight_type, calculated_weight, evaluating_practitioner_id FROM rule_execution_contexts WHERE id = '01a1d17c-15c4-78c5-adab-393ff7e5dd68';
INSERT INTO rule_not_fired_results (id, created_date, last_modified_date, rule_identifier, rule_execution_context_id, details, explanation)
VALUES (gen_random_uuid(), now(), now(), 'a-antibiotic-early-redose', '22222222-2222-2222-2222-000000000004', '{"CRCL": 55}', 'staged for rescore validation');
INSERT INTO rule_execution_contexts (id, created_date, last_modified_date, patient_id, operation_id, user_id, evaluation_mode, tracking_id, weight_classification, weight_type, calculated_weight, evaluating_practitioner_id)
SELECT '22222222-2222-2222-2222-000000000005', created_date, now(), patient_id, operation_id, user_id, evaluation_mode, tracking_id, weight_classification, weight_type, calculated_weight, evaluating_practitioner_id FROM rule_execution_contexts WHERE id = '01a1d17c-15c4-78c5-adab-393ff7e5dd68';
INSERT INTO rule_fired_results (id, created_date, last_modified_date, rule_identifier, rule_execution_context_id, suppressed, suppression_allowed, details, default_dose_override, route_default_dose_override, evaluation_mode, "trigger", prompt, route_dose_option_override, route_weight_based_dose_option_override, accepted)
SELECT '11111111-1111-1111-1111-000000000001', created_date, now(), 'w-default-dose-adjustment', rule_execution_context_id, suppressed, suppression_allowed, details, '{"doseAmount":15,"doseUnits":"mg/kg"}', '{"INTRAVENOUS":{"doseAmount":15,"doseUnits":"mg/kg"}}', evaluation_mode, "trigger", prompt, route_dose_option_override, route_weight_based_dose_option_override, accepted
FROM rule_fired_results WHERE id = '01a1d17c-15c0-7615-a8a5-1191cb8a2492';
INSERT INTO rule_fired_results (id, created_date, last_modified_date, rule_identifier, rule_execution_context_id, suppressed, suppression_allowed, details, default_dose_override, route_default_dose_override, evaluation_mode, "trigger", prompt, route_dose_option_override, route_weight_based_dose_option_override, accepted)
SELECT '11111111-1111-1111-1111-000000000002', created_date, now(), 'w-default-dose-adjustment', rule_execution_context_id, suppressed, suppression_allowed, details, '{"doseAmount":15,"doseUnits":"mg/kg"}', '{"INTRAVENOUS":{"doseAmount":15,"doseUnits":"mg/kg"}}', evaluation_mode, "trigger", prompt, route_dose_option_override, route_weight_based_dose_option_override, accepted
FROM rule_fired_results WHERE id = '01a1d179-5f87-759b-992a-9c58e26a4195';
INSERT INTO rule_fired_results (id, created_date, last_modified_date, rule_identifier, rule_execution_context_id, suppressed, suppression_allowed, details, default_dose_override, route_default_dose_override, evaluation_mode, "trigger", prompt, route_dose_option_override, route_weight_based_dose_option_override, accepted)
SELECT '11111111-1111-1111-1111-000000000003', created_date, now(), 'w-default-dose-adjustment', rule_execution_context_id, suppressed, suppression_allowed, details, '{"doseAmount":15,"doseUnits":"mg/kg"}', '{"INTRAVENOUS":{"doseAmount":15,"doseUnits":"mg/kg"}}', evaluation_mode, "trigger", prompt, route_dose_option_override, route_weight_based_dose_option_override, accepted
FROM rule_fired_results WHERE id = '01a1d179-6cbd-7900-bbac-616131a2479f';
INSERT INTO rule_fired_results (id, created_date, last_modified_date, rule_identifier, rule_execution_context_id, suppressed, suppression_allowed, details, default_dose_override, route_default_dose_override, evaluation_mode, "trigger", prompt, route_dose_option_override, route_weight_based_dose_option_override, accepted)
SELECT '11111111-1111-1111-1111-000000000004', created_date, now(), 'w-default-dose-adjustment', '22222222-2222-2222-2222-000000000004', suppressed, suppression_allowed, details, '{"doseAmount":15,"doseUnits":"mg/kg"}', '{"INTRAVENOUS":{"doseAmount":15,"doseUnits":"mg/kg"}}', evaluation_mode, "trigger", prompt, route_dose_option_override, route_weight_based_dose_option_override, accepted
FROM rule_fired_results WHERE id = '01a1d17c-15c0-7615-a8a5-1191cb8a2492';
INSERT INTO rule_fired_results (id, created_date, last_modified_date, rule_identifier, rule_execution_context_id, suppressed, suppression_allowed, details, default_dose_override, route_default_dose_override, evaluation_mode, "trigger", prompt, route_dose_option_override, route_weight_based_dose_option_override, accepted)
SELECT '11111111-1111-1111-1111-000000000005', created_date, now(), 'w-default-dose-adjustment', '22222222-2222-2222-2222-000000000005', suppressed, suppression_allowed, details, '{"doseAmount":15,"doseUnits":"mg/kg"}', '{"INTRAVENOUS":{"doseAmount":15,"doseUnits":"mg/kg"}}', evaluation_mode, "trigger", prompt, route_dose_option_override, route_weight_based_dose_option_override, accepted
FROM rule_fired_results WHERE id = '01a1d17c-15c0-7615-a8a5-1191cb8a2492';
INSERT INTO compliance_results (id, created_date, last_modified_date, label, rule_fired_result_id, compliant)
SELECT gen_random_uuid(), now(), now(), 'default-dose', id, false FROM rule_fired_results WHERE id::text LIKE '11111111-1111-1111-1111-%';
COMMIT;
