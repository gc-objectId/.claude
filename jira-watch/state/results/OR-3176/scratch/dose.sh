#!/bin/bash
# usage: dose.sh <patient_uuid> <operation_uuid|NULL> <medication_identifier> <hours_before_now> [label]
set -e
PT=$1; OP=$2; MED=$3; HRS=$4; LABEL=${5:-dose}
[ "$OP" = "NULL" ] && OPV="NULL" || OPV="'$OP'"
docker exec orci-loop-or-3176-postgres-1 psql -U orci -At -c "set search_path to \"mayo-mayo\";
with m as (select id, medication_identifier, short_name from medications where medication_identifier='$MED'),
o as (insert into medication_orders (id, created_date, last_modified_date, patient_id, operation_id, client_order_id, medication_administration_type, ordering_provider_specialties, deleted)
      values (gen_random_uuid(), now(), now(), '$PT', $OPV, '$LABEL', 'BOLUS', '[]', false) returning id)
insert into medication_administrations (id, created_date, last_modified_date, patient_id, operation_id, medication_id, medication_identifier, medication_name, administration_date, dose_amount, dose_units, route, source_type, codings, concentrations, ordering_provider_specialties, medication_order_id, deleted)
select gen_random_uuid(), now(), now(), '$PT', $OPV, m.id, m.medication_identifier, m.short_name, now() - interval '$HRS hours', 1, 'mg', 'INTRAVENOUS', 'EMR', '[]', '[]', '[]', o.id, false from m, o
returning id, medication_identifier, administration_date;"
