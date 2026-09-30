#!/bin/zsh
# mkstale.sh NAME  — stale (40h old) quartz job owned by demo-demo + open job_metadata row in demo-demo schema
NAME=$1
NOW=$(($(date +%s)*1000))
START=$((NOW - 40*3600*1000))
NEXT=$((NOW + 30*24*3600*1000))
/Users/ryanducharme/.claude/jira-watch/state/results/OR-2928/scratch/psql.sh <<SQL
begin;
insert into "demo-demo".patients (id, mrn, pmrn, created_date, last_modified_date)
  select '11111111-1111-1111-1111-111111111111','cleaner-mrn','cleaner-pmrn',now(),now()
  where not exists (select 1 from "demo-demo".patients where id='11111111-1111-1111-1111-111111111111');
insert into "demo-demo".operations (id, patient_id, eras_operation, case_id, created_date, last_modified_date)
  select '22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111',false,'CLEANER-CASE',now(),now()
  where not exists (select 1 from "demo-demo".operations where id='22222222-2222-2222-2222-222222222222');
insert into public.qrtz_job_details (sched_name, job_name, job_group, description, job_class_name, is_durable, is_nonconcurrent, is_update_data, requests_recovery, job_data)
  select 'lowFrequencyScheduler', '$NAME', 'post-insulin-glucose-check', 'validation stale job', 'com.guided.orci.engine.rule.scheduled.PostInsulinGlucoseCheckJob', false, true, false, false, job_data
  from public.qrtz_job_details where job_name='job-cleaner-demo-demo';
insert into public.qrtz_triggers (sched_name, trigger_name, trigger_group, job_name, job_group, description, next_fire_time, prev_fire_time, priority, trigger_state, trigger_type, start_time, end_time, calendar_name, misfire_instr, job_data)
  values ('lowFrequencyScheduler', '$NAME', 'post-insulin-glucose-check', '$NAME', 'post-insulin-glucose-check', 'validation stale trigger', $NEXT, -1, 5, 'WAITING', 'SIMPLE', $START, 0, null, 0, null);
insert into public.qrtz_simple_triggers (sched_name, trigger_name, trigger_group, repeat_count, repeat_interval, times_triggered)
  values ('lowFrequencyScheduler', '$NAME', 'post-insulin-glucose-check', -1, 3600000, 0);
insert into "demo-demo".job_metadata (id, completed, created_date, last_modified_date, operation_id, patient_id, description, job_class, job_group, job_name, tenant_key, trigger_group, trigger_name)
  values (gen_random_uuid(), false, now(), now(), '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'validation stale metadata', 'com.guided.orci.engine.rule.scheduled.PostInsulinGlucoseCheckJob', 'post-insulin-glucose-check', '$NAME', 'demo-demo', 'post-insulin-glucose-check', '$NAME');
commit;
SQL
