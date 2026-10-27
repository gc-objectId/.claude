-- @metabase-name: Mayo Lifetime Counts - Prod
-- @metabase-default: START_DATE=2026-08-30
-- @metabase-default: END_DATE=2027-01-01
-- Totals between a Start Date and an End Date for the cases that ran, the patients they ran on,
-- and the doses given during them.
--
-- The End Date is exclusive and defaults past the end of the data, so the card opens on everything
-- from the Start Date to now and reports a lifetime total until someone narrows it.
--
-- Both dates are calendar dates read as midnight Central, and their defaults are fixed ones.
-- Metabase substitutes a date variable's default as a literal, so the card counts the window
-- this file names until the file names another; there is no expression that would let it follow
-- the calendar on its own.
--
-- The three counts share one cohort, the operations in mayo_operations, rather than being three
-- independent table totals:
--
--   operations   mayo_operations, by start_time            the cases that ran
--   patients     distinct patients on those cases          who they ran on
--   med admins   the intra-op subset, by administration_date   the doses given during them
--
-- Patients are counted through their cases rather than by patients.created_date, so a patient we
-- hold no case for is left out. That is the intent: the card reports the population the cases
-- describe, not the size of the patient table.
--
-- Med admins read mayo_shared_metric_med_admin_facts_v, because intra-op is temporal and that view
-- is where the case window is applied. It is the same view the intra-op bar chart and the
-- error-rate denominator read, so the three cannot drift into three different intra-op counts. It
-- carries the metric cohort with it, so a dose counts only on an adult, room-known, closed case
-- while the operation count above carries no such restriction. The two are different slices of
-- the same cohort and the operations figure is deliberately the wider one.
--
-- A row whose date is null falls outside every window and is therefore counted in none of them.
-- That is the intent for operations: Mayo schedules far more cases than run, and a case with no
-- start_time never reached an OR, so counting the schedule would report a volume no OR ever saw.
WITH timeframe AS (
    -- start_time and administration_date store naive UTC, so the bounds are converted to the same
    -- form and their indexes stay usable. Converting the columns would force a scan instead.
    SELECT timezone('UTC', timezone('US/Central', {{START_DATE}}::timestamp)) AS start_utc,
           timezone('UTC', timezone('US/Central', {{END_DATE}}::timestamp))   AS end_utc
),
     counts AS (
         SELECT 1                            AS ord,
                'num patients'               AS metric,
                COUNT(DISTINCT o.patient_id) AS num
         FROM "mayo-mayo".mayo_operations o
                  CROSS JOIN timeframe t
         WHERE o.start_time >= t.start_utc
           AND o.start_time < t.end_utc

         UNION ALL

         SELECT 2,
                'num operations',
                COUNT(*)
         FROM "mayo-mayo".mayo_operations o
                  CROSS JOIN timeframe t
         WHERE o.start_time >= t.start_utc
           AND o.start_time < t.end_utc

         UNION ALL

         SELECT 3,
                'num med admins',
                COUNT(*)
         FROM "mayo-mayo".mayo_shared_metric_med_admin_facts_v ma
                  CROSS JOIN timeframe t
         WHERE ma.event_time_utc >= t.start_utc
           AND ma.event_time_utc < t.end_utc
     )
SELECT metric,
       num
FROM counts
ORDER BY ord;
