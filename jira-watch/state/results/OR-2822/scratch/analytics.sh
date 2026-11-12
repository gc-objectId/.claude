#!/bin/bash
source $(dirname "$0")/common.sh
node $S/api.js login >/dev/null
echo "=== (1) post-restore SQL re-check"; $A POST /actuator/loggers/org.hibernate.SQL '{"configuredLevel":"DEBUG"}' >/dev/null; echo "API: $(ops_api)"
echo "operations SELECT (last 2m), columns before created_date:"; docker logs --since 2m orci-loop-or-2822-orci-1 2>&1 | grep "org.hibernate.SQL" | grep "from operations" | tail -1 | grep -o "select o1_0.id,.*o1_0.created_date" | head -1
echo "signature count whole log: $(docker logs orci-loop-or-2822-orci-1 2>&1 | grep -c 'o1_0.case_id,o1_0.classification,o1_0.created_date')"
$A POST /actuator/loggers/org.hibernate.SQL '{"configuredLevel":null}' >/dev/null
echo "=== (2) stage analytics operations"
for T in mgb-mgh mayo-mayo; do
  P=$($A POST /api/admin/patients/ '{"prmnPrefix":"or2822"}' "$T"); PM=$(echo "$P" | j .pmrn); PU=$(echo "$P" | j .uuid)
  C=$($A POST "/api/admin/patients/$PU/operations/create" "{\"startTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"procedureTypes\":[]}" "$T" | j .caseId)
  AC=$([ $T = mgb-mgh ] && echo URGENT || echo EMERGENT)
  echo "$T case=$C patch -> $($A PATCH "/api/admin/patients/$PM/operations/$C/acuity" "{\"acuity\":\"$AC\"}" "$T" | j .acuity)"
  echo "$(echo $T | tr a-z- A-Z_)_CASE=$C" >> $S/ids.txt
done
sed "s/^/export /" $S/ids.txt > $S/ids.sh; source $S/ids.sh
PGF="docker exec orci-loop-or-2822-postgres-1 psql -U orci -d orci -v ON_ERROR_STOP=1 -q"
echo "=== (3) shipped mgb-mgh file"; $PGF -f /tmp/shipped_mgh.sql 2>&1 | tail -3; echo "exit=${PIPESTATUS[0]}"
$PG -c "select 'mgh view: case_id='||case_id||' acuity='||coalesce(acuity,'<null>')||' room_known='||room_known from \"mgb-mgh\".mgh_operations_incl_unknown_room_v where case_id='$MGB_MGH_CASE'"
echo "=== (3) shipped mayo-mayo file"; $PGF -f /tmp/shipped_mayo.sql 2>&1 | tail -3; echo "exit=${PIPESTATUS[0]}"
$PG -c "select 'mayo view: case_id='||case_id||' acuity='||coalesce(acuity,'<null>') from \"mayo-mayo\".mayo_operations where case_id='$MAYO_MAYO_CASE'"
$PG -c "select 'mayo raw: case_id='||case_id||' acuity='||coalesce(acuity,'<null>')||' room='||coalesce(operating_room_name,'<null>') from \"mayo-mayo\".operations where case_id='$MAYO_MAYO_CASE'"
echo "=== (4) PRE-FIX mgb-mgh file (expect failure on o.classification)"; $PGF -f /tmp/prefix_mgh.sql 2>&1 | grep -i -E "error|classification" | head -3; echo "exit=${PIPESTATUS[0]}"
echo "=== (4) PRE-FIX mayo-mayo file (expect failure)"; $PGF -f /tmp/prefix_mayo.sql 2>&1 | grep -i -E "error|classification" | head -3; echo "exit=${PIPESTATUS[0]}"
echo "=== (5) re-apply shipped files"; $PGF -f /tmp/shipped_mgh.sql 2>&1 | tail -1; echo "mgh exit=${PIPESTATUS[0]}"; $PGF -f /tmp/shipped_mayo.sql 2>&1 | tail -1; echo "mayo exit=${PIPESTATUS[0]}"
$PG -c "select 'mgh view after revert: case_id='||case_id||' acuity='||coalesce(acuity,'<null>') from \"mgb-mgh\".mgh_operations_incl_unknown_room_v where case_id='$MGB_MGH_CASE'"
