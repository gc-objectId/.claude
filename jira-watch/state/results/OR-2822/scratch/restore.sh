#!/bin/bash
source $(dirname "$0")/common.sh
echo "=== RESTORE: remove swapped classes"
docker exec orci-loop-or-2822-orci-1 sh -c 'rm -rf /app/classes/com/guided/orci/models/patient; echo "models dir now:"; ls /app/classes/com/guided/orci/models/; find /app/classes -name "Operation*.class"; sha256sum /app/libs/orci-models-0.1.105-SNAPSHOT.jar' | tee $S/jar-sha-after.txt
diff <(grep jar $S/jar-sha-before.txt) <(grep jar $S/jar-sha-after.txt) && echo "jar checksum unchanged"
echo "=== restarting app $(date -u +%T)"; RESTORE_AT=$(date -u +%Y-%m-%dT%H:%M:%S); docker restart orci-loop-or-2822-orci-1 >/dev/null; wait_up || exit 1
echo "=== enable hibernate SQL logging"; $A POST /actuator/loggers/org.hibernate.SQL '{"configuredLevel":"DEBUG"}' | head -1
echo "=== GREEN read (shipped class restored)"; echo "API: $(ops_api)"; echo "DB:  $(ops_db)"
echo "=== operations SELECTs since restore mentioning classification: $(docker logs --since "$RESTORE_AT" orci-loop-or-2822-orci-1 2>&1 | grep -c 'o1_0.case_id,o1_0.classification,o1_0.created_date')"
echo "=== operations SELECT since restore (first 200 chars):"; docker logs --since "$RESTORE_AT" orci-loop-or-2822-orci-1 2>&1 | grep "org.hibernate.SQL" | grep "from operations" | head -1 | sed 's/.*: select/select/' | cut -c1-200
echo "=== signature occurrences in the whole container log: $(docker logs orci-loop-or-2822-orci-1 2>&1 | grep -c 'o1_0.case_id,o1_0.classification,o1_0.created_date')"
$A POST /actuator/loggers/org.hibernate.SQL '{"configuredLevel":null}' | head -1
echo "=== drop the re-added column (back to shipped schema)"; $PG -c 'ALTER TABLE "demo-demo".operations DROP COLUMN classification'
$PG -c "select table_schema||' '||column_name from information_schema.columns where table_name='operations' and column_name in ('acuity','classification') order by 1"
