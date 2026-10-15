#!/bin/sh
S=/Users/ryanducharme/.claude/jira-watch/state/results/OR-2949/scratch
cd $S && node stage.js > $S/$1.json && cut -c1-200 $S/$1.json
PMRN=$(node -e "console.log(require('$S/$1.json').pmrn)"); CASE=$(node -e "console.log(require('$S/$1.json').caseId)"); PUUID=$(node -e "console.log(require('$S/$1.json').uuid)")
OPID=$($S/q.sh "select id from \"demo-demo\".operations where case_id='$CASE' and patient_id='$PUUID'")
echo "operation=$OPID pmrn=$PMRN case=$CASE"
node $S/medadmin.js $PMRN $CASE m-cefazolin
$S/q.sh "select medication_identifier, route, administration_date, medication_order_id is not null as has_order from \"demo-demo\".medication_administrations where operation_id='$OPID'"
node $S/event.js $PMRN $CASE PROCEDURE_START; sleep 3
$S/results.sh $OPID
