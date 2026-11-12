#!/bin/bash
PG="docker exec orci-loop-or-2822-postgres-1 psql -U orci -d orci -At"
echo "===SCHEMAS==="
$PG -c "select nspname from pg_namespace where nspname not like 'pg_%' and nspname<>'information_schema' order by 1"
echo "===228 ROWS + OPS COUNT==="
for s in $($PG -c "select table_schema from information_schema.tables where table_name='databasechangelog' order by 1"); do
  echo "schema=$s"
  $PG -c "select '  228: '||id||' | '||exectype||' | '||dateexecuted from \"$s\".databasechangelog where id like '228%'"
  $PG -c "select '  operations rows='||count(*) from \"$s\".operations" 2>/dev/null
done
echo "===COLS==="
$PG -c "select table_schema||' '||column_name||' '||data_type from information_schema.columns where table_name='operations' and column_name in ('acuity','classification') order by 1"
