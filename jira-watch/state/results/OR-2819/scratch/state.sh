#!/bin/bash
OP=$1
docker exec orci-loop-or-2819-postgres-1 psql -U orci -d orci -x -c "
select o.case_id, o.evaluation_mode, o.initial_app_launch_time, o.last_modified_date,
 (select count(*) from \"demo-demo\".operation_sessions s where s.operation_id=o.id) as sessions,
 (select count(*) from \"demo-demo\".interactive_case_launch_events e where e.operation_id=o.id) as launch_events,
 (select count(*) from \"demo-demo\".operation_events oe where oe.operation_id=o.id) as operation_events
from \"demo-demo\".operations o where o.id='$OP';"
docker exec orci-loop-or-2819-postgres-1 psql -U orci -d orci -c "
select event_type, target_type, target, context, created_at from \"demo-demo\".audit_events order by created_at desc limit 8;"
