#!/bin/zsh
# fire.sh TENANT — make that tenant's hourly cleaner trigger due now
NOW=$(($(date +%s)*1000))
/Users/ryanducharme/.claude/jira-watch/state/results/OR-2928/scratch/psql.sh -c "update public.qrtz_triggers set next_fire_time=$NOW where trigger_name='hourly-run-$1' and trigger_group='job-cleaner' returning trigger_name, trigger_state, to_timestamp(next_fire_time/1000)"
