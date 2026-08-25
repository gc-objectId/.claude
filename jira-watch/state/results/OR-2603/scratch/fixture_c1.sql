SET search_path TO "mgb-mgh";
INSERT INTO patients (id, created_date, last_modified_date, mrn, pmrn, first_name, last_name)
VALUES (md5('patC1')::uuid, now(), now(), 'MRN-C1', 'PMRN-C1', 'Test', 'C1');
INSERT INTO operations (id, created_date, last_modified_date, patient_id, eras_operation, case_id,
                        operating_room_name, evaluation_mode, pediatric_status, start_time, end_time, primary_practitioner_id)
VALUES (md5('opC1')::uuid, now(), now(), md5('patC1')::uuid, false, 'CASE-C1', 'MGH OR 05', 'INTERACTIVE', 'ADULT',
        timestamp '2026-02-13 13:00', timestamp '2026-02-13 17:00', '00000000-0000-0000-0000-0000000000f1');
INSERT INTO medication_administrations (id, created_date, last_modified_date, patient_id, operation_id,
       medication_id, medication_identifier, medication_name, administration_date, dose_amount, dose_units,
       route, source_type, tracking_id, documenting_practitioner_id, deleted)
VALUES (md5('maC1')::uuid, now(), now(), md5('patC1')::uuid, md5('opC1')::uuid,
        '01a03572-715e-789f-84b9-3320cc4ba37f', NULL, 'EXPAREL 266 MG/20ML',
        timestamp '2026-02-13 15:00', 20, 'mL', 'INFILTRATION', 'EMR', md5('trkC1')::uuid,
        '00000000-0000-0000-0000-0000000000d1', false);
