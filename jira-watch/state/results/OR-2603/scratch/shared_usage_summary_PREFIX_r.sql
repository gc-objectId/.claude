-- Volume summary across interactive and silent mode.
-- Returns per-mode: unique users, operation count, med admin count (anesthesia roles),
-- and total med admin count.
--
-- Anesthesia role groups: Anesthesiologist, Resident/Fellow, CRNA.
-- Interactive unique users = unique user_id from interactive_case_launch_events.
-- Silent unique users      = unique primary_practitioner_id on the operation.
-- Med admin source_type:
--   interactive → EMR or APPLICATION
--   silent      → EMR only
--
-- Performance: users/operations and med admins are aggregated independently then
-- combined with CROSS JOIN to avoid fanout from joining operations to med admins.
WITH timeframe AS (
    SELECT timezone('UTC', timezone('US/Eastern', '2026-01-01')) AS timeframe_start,
           timezone('UTC', timezone('US/Eastern', '2026-04-01'))   AS timeframe_end
),
     role_mapping AS (
         SELECT 'Anesthesiologist'::text AS role_group, 'Anesthesiologist'::text AS practitioner_role
         UNION ALL SELECT 'Resident/Fellow', 'Fellow'
         UNION ALL SELECT 'Resident/Fellow', 'Resident'
         UNION ALL SELECT 'CRNA', 'Nurse Anesthetist'
         UNION ALL SELECT 'CRNA', 'Student Nurse Anesthetist'
         UNION ALL SELECT 'CRNA', 'Nurse Anesthetist - Independent'
     ),
     interactive_operations AS (
         SELECT o.operation_id,
                o.start_time,
                o.end_time
         FROM "mgb-mgh".mgh_interactive_operations o
         WHERE o.start_time >= (SELECT timeframe_start FROM timeframe)
           AND o.start_time < (SELECT timeframe_end FROM timeframe)
     ),
     silent_operations AS (
         SELECT o.operation_id,
                o.start_time,
                o.end_time,
                o.primary_practitioner_id
         FROM "mgb-mgh".mgh_silent_mode_operations o
         WHERE o.start_time >= (SELECT timeframe_start FROM timeframe)
           AND o.start_time < (SELECT timeframe_end FROM timeframe)
     ),
     interactive_user_ops AS (
         SELECT COUNT(DISTINCT icle.user_id)       AS unique_users,
                COUNT(DISTINCT io.operation_id)    AS operations
         FROM interactive_operations io
                  JOIN "mgb-mgh".interactive_case_launch_events icle ON icle.operation_id = io.operation_id
     ),
     silent_user_ops AS (
         SELECT COUNT(DISTINCT primary_practitioner_id) AS unique_users,
                COUNT(DISTINCT operation_id)            AS operations
         FROM silent_operations
     ),
     interactive_med_admin_agg AS (
         SELECT COUNT(ma.id) FILTER (WHERE rm.role_group IS NOT NULL) AS med_admins_anesthesia_roles,
                COUNT(ma.id)                                          AS med_admins_all
         FROM "mgb-mgh".mgh_active_medication_administrations ma
                  JOIN interactive_operations o ON ma.operation_id = o.operation_id
                  LEFT JOIN "mgb-mgh".practitioners prac ON prac.id = ma.documenting_practitioner_id
                  LEFT JOIN role_mapping rm ON rm.practitioner_role = prac.role
         WHERE ma.administration_date >= (SELECT timeframe_start FROM timeframe)
           AND ma.administration_date < (SELECT timeframe_end FROM timeframe)
           AND ma.administration_date >= o.start_time
           AND ma.administration_date <= o.end_time
           AND ma.source_type IN ('EMR', 'APPLICATION')
           AND COALESCE(ma.deleted, false) = false
     ),
     silent_med_admin_agg AS (
         SELECT COUNT(ma.id) FILTER (WHERE rm.role_group IS NOT NULL) AS med_admins_anesthesia_roles,
                COUNT(ma.id)                                          AS med_admins_all
         FROM "mgb-mgh".mgh_active_medication_administrations ma
                  JOIN silent_operations o ON ma.operation_id = o.operation_id
                  LEFT JOIN "mgb-mgh".practitioners prac ON prac.id = ma.documenting_practitioner_id
                  LEFT JOIN role_mapping rm ON rm.practitioner_role = prac.role
         WHERE ma.administration_date >= (SELECT timeframe_start FROM timeframe)
           AND ma.administration_date < (SELECT timeframe_end FROM timeframe)
           AND ma.administration_date >= o.start_time
           AND ma.administration_date <= o.end_time
           AND ma.source_type = 'EMR'
           AND COALESCE(ma.deleted, false) = false
     )
SELECT 'interactive'::text           AS mode,
       iuo.unique_users,
       iuo.operations,
       ima.med_admins_anesthesia_roles,
       ima.med_admins_all
FROM interactive_user_ops iuo
         CROSS JOIN interactive_med_admin_agg ima

UNION ALL

SELECT 'silent'::text                AS mode,
       suo.unique_users,
       suo.operations,
       sma.med_admins_anesthesia_roles,
       sma.med_admins_all
FROM silent_user_ops suo
         CROSS JOIN silent_med_admin_agg sma;
