#!/bin/bash
source $(dirname "$0")/common.sh
node $S/api.js login >/dev/null
echo "=== NEGATIVE: PATCH $DISAGREE acuity null (fixed code: classification must stay)"
echo "PATCH -> $($A PATCH "/api/admin/patients/$PMRN/operations/$DISAGREE/acuity" '{"acuity":null}' | j .acuity)"
echo "DB:  $(ops_db)"; echo "API: $(ops_api)"
echo "=== pre-swap state"; docker exec orci-loop-or-2822-orci-1 sh -c 'ls /app/classes/com/guided/orci/models/; sha256sum /app/libs/orci-models-0.1.105-SNAPSHOT.jar' | tee $S/jar-sha-before.txt
echo "=== SWAP pre-fix classes into /app/classes"
docker exec orci-loop-or-2822-orci-1 sh -c 'mkdir -p /app/classes/com/guided/orci/models/patient && cp /tmp/prefix/classes/com/guided/orci/models/patient/Operation*.class /app/classes/com/guided/orci/models/patient/ && ls -la /app/classes/com/guided/orci/models/patient/'
echo "=== restarting app $(date -u +%T)"; docker restart orci-loop-or-2822-orci-1 >/dev/null; wait_up || exit 1
echo "=== enable hibernate SQL logging"; $A POST /actuator/loggers/org.hibernate.SQL '{"configuredLevel":"DEBUG"}' | head -1
echo "=== RED read (pre-fix class live)"; echo "API: $(ops_api)"; echo "DB:  $(ops_db)"
echo "=== SQL log lines mentioning classification"; docker logs --since 2m orci-loop-or-2822-orci-1 2>&1 | grep -i "classification" | grep -i "from operations\|operations " | head -3 | cut -c1-600
