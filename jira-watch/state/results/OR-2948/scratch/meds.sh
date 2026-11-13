#!/bin/sh
# usage: meds.sh <pmrn> <caseId> <medication_identifier> <minutes_before_start>
PMRN=$1; CASE=$2; MED=$3; MIN=$4
docker exec orci-loop-or-2948-postgres-1 psql -U orci -d orci -v ON_ERROR_STOP=1 -Atc "
set search_path to \"demo-demo\", public;
with p as (select id pid from patients where pmrn='$PMRN'),
     o as (select id oid, start_time from operations where case_id='$CASE'),
     m as (select id mid, medication_identifier, short_name from medications where medication_identifier='$MED'),
     ord as (insert into medication_orders(id, created_date, last_modified_date, patient_id, operation_id, medication_administration_type, ordering_provider_specialties)
             select gen_random_uuid(), now(), now(), pid, oid, 'BOLUS', '[]'::json from p, o returning id)
insert into medication_administrations(id, created_date, last_modified_date, patient_id, operation_id, medication_id, medication_identifier, medication_name, dose_amount, dose_units, route, source_type, codings, concentrations, administration_date, medication_order_id)
select gen_random_uuid(), now(), now(), pid, oid, mid, medication_identifier, short_name, 1, 'g', 'INTRAVENOUS', 'APPLICATION', '[]'::json, '[]'::json, start_time - interval '$MIN minutes', ord.id from p, o, m, ord
returning medication_identifier, administration_date;"
