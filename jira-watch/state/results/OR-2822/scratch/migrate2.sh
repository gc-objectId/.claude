#!/bin/bash
source $(dirname "$0")/common.sh
node $S/api.js login >/dev/null
mk() { $A POST "/api/admin/patients/$UUID/operations/create" "{\"startTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"procedureTypes\":[]}" | j .caseId; }
C2=$(mk); C3=$(mk); C4=$(mk); echo "STRAGGLER=$C2 DISAGREE=$C3 BOTHNULL=$C4" | tee -a $S/ids.txt
echo "PATCH $C3 ELECTIVE -> $($A PATCH "/api/admin/patients/$PMRN/operations/$C3/acuity" '{"acuity":"ELECTIVE"}' | j .acuity)"
$PG -c "update \"demo-demo\".operations set classification='EMERGENT' where case_id='$C2'"
$PG -c "update \"demo-demo\".operations set classification='URGENT' where case_id='$C3'"
echo "=== BEFORE re-run: API"; ops_api; echo "=== BEFORE re-run: DB"; ops_db
$PG -c "delete from \"demo-demo\".databasechangelog where id='228-backfill-straggler-acuity'"
echo "=== restarting app $(date -u +%T)"; docker restart orci-loop-or-2822-orci-1 >/dev/null; wait_up || exit 1
echo "=== AFTER re-run: changelog"; $PG -c "select id||' | '||exectype||' | '||dateexecuted from \"demo-demo\".databasechangelog where id='228-backfill-straggler-acuity'"
echo "=== AFTER re-run: DB"; ops_db; echo "=== AFTER re-run: API"; ops_api
