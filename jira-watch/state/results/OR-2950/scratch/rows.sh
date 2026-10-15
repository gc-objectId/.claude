#!/bin/sh
for s in mgb-mgh demo-demo mayo-mayo mgb-icsnh; do
  docker exec orci-loop-or-2950-postgres-1 psql -U orci -d orci -tAc "select '$s' as schema, message_control_id, status, sending_facility from \"$s\".hl7_inbound_messages where message_control_id like 'OR2950%' order by 2"
done
echo "--- public.hl7_inbound_message_log"
docker exec orci-loop-or-2950-postgres-1 psql -U orci -d orci -tAc "select tenant_key, message_control_id, status from public.hl7_inbound_message_log where message_control_id like 'OR2950%' order by 2"
