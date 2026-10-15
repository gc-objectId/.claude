#!/bin/sh
S=/Users/ryanducharme/.claude/jira-watch/state/results/OR-2949/scratch
cd $S && node stage.js > $S/$1.json && cat $S/$1.json
PMRN=$(node -e "console.log(require('$S/$1.json').pmrn)"); CASE=$(node -e "console.log(require('$S/$1.json').caseId)"); PUUID=$(node -e "console.log(require('$S/$1.json').uuid)")
OPID=$($S/q.sh "select id from \"demo-demo\".operations where case_id='$CASE' and patient_id='$PUUID'")
echo "operation=$OPID"
$S/q.sh "insert into \"demo-demo\".medication_administrations (id, created_date, last_modified_date, patient_id, operation_id, medication_id, medication_identifier, medication_name, dose_amount, dose_units, route, administration_date, source, deleted) values (gen_random_uuid(), now(), now(), '$PUUID', '$OPID', '01a13ac4-93c4-743d-98ab-71c4068ce2ac', 'm-cefazolin', 'CeFAZolin', 2, 'g', 'INTRAVENOUS', now() - interval '10 min', 'manual', false)"
$S/q.sh "select medication_identifier, route, administration_date from \"demo-demo\".medication_administrations where operation_id='$OPID'"
node $S/event.js $PMRN $CASE PROCEDURE_START; sleep 3
$S/results.sh $OPID
