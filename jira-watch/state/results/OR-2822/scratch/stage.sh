#!/bin/bash
S=$(dirname "$0"); A="node $S/api.js"; PG="docker exec orci-loop-or-2822-postgres-1 psql -U orci -d orci -At"
node $S/api.js login >/dev/null
j() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const lines=d.trim().split("\n");const o=JSON.parse(lines.slice(1).join("\n"));console.log(eval("o"+process.argv[1]))})' "$1"; }
P=$($A POST /api/admin/patients/ '{"prmnPrefix":"or2822"}')
echo "create patient: $P"
PMRN=$(echo "$P" | j .pmrn); UUID=$(echo "$P" | j .uuid)
O=$($A POST "/api/admin/patients/$UUID/operations/create" "{\"startTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"procedureTypes\":[]}")
echo "create op: $(echo "$O" | head -c 300)"
CASE=$(echo "$O" | j .caseId)
echo "PMRN=$PMRN UUID=$UUID CASE=$CASE" | tee $S/ids.txt
echo "--- initial GET acuity:"; $A GET "/api/admin/patients/by-pmrn/$PMRN/operations" | j '[0].acuity'
echo "--- PATCH acuity URGENT:"; $A PATCH "/api/admin/patients/$PMRN/operations/$CASE/acuity" '{"acuity":"URGENT"}' | j .acuity
echo "--- GET after PATCH:"; $A GET "/api/admin/patients/by-pmrn/$PMRN/operations" | j '[0].acuity'
echo "--- DB row:"; $PG -c "select 'case_id='||case_id||' acuity='||coalesce(acuity,'<null>') from \"demo-demo\".operations where case_id='$CASE'"
echo "--- PATCH acuity BOGUS (expect 400):"; $A PATCH "/api/admin/patients/$PMRN/operations/$CASE/acuity" '{"acuity":"BOGUS"}' | head -1
