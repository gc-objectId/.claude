#!/bin/bash
docker exec orci-loop-or-2819-postgres-1 psql -U orci -d orci -At -c "
do \$\$ begin end \$\$;" >/dev/null 2>&1
docker exec orci-loop-or-2819-postgres-1 psql -U orci -d orci -At -c "
select string_agg(t||'='||c, E'\n' order by t) from (
  select c.relname as t, (xpath('/row/cnt/text()', query_to_xml(format('select count(*) as cnt from %I.%I','demo-demo',c.relname), false,true,'')))[1]::text::int as c
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='demo-demo' and c.relkind='r'
) s;"
