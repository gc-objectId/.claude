#!/bin/zsh
# state.sh — quartz job rows in the validation group, demo-demo metadata rows, cleaner prev/next fire times
P=/Users/ryanducharme/.claude/jira-watch/state/results/OR-2928/scratch/psql.sh
echo "-- quartz jobs (post-insulin-glucose-check group)"; $P -c "select job_name from public.qrtz_job_details where job_group='post-insulin-glucose-check' order by 1"
echo "-- demo-demo job_metadata"; $P -c 'select job_name, completed from "demo-demo".job_metadata order by 1'
echo "-- cleaners"; $P -c "select trigger_name, trigger_state, to_timestamp(prev_fire_time/1000) prev, to_timestamp(next_fire_time/1000) next from public.qrtz_triggers where trigger_group='job-cleaner' order by 1"
