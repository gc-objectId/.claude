#!/bin/sh
# Tears down an ephemeral app-under-test created by env-up.sh.
#
#   env-down.sh <run-id> [--keep-log]
#
# Exit: 0 everything gone (or already absent), 1 usage, 7 something survived teardown.
set -eu

STATE_ROOT="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}/state/envs"

say() { printf '%s\n' "$*" >&2; }

[ $# -ge 1 ] || { say "Usage: env-down.sh <run-id> [--keep-log]"; exit 1; }

run_id="$1"
keep_log="${2:-}"
run_dir="${STATE_ROOT}/${run_id}"
pid_file="${run_dir}/app.pid"

pg_name="orci-loop-pg-${run_id}"
valkey_name="orci-loop-valkey-${run_id}"

if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        waited=0
        while kill -0 "$pid" 2>/dev/null; do
            waited=$((waited + 1))
            [ "$waited" -ge 20 ] && { say "App ${pid} ignored SIGTERM; sending SIGKILL"; kill -9 "$pid" 2>/dev/null || true; break; }
            sleep 1
        done
        say "App process ${pid} stopped"
    fi
    rm -f "$pid_file"
fi

docker rm -f "$pg_name" "$valkey_name" >/dev/null 2>&1 || true

survivors=$(docker ps -aq --filter "name=orci-loop-pg-${run_id}" --filter "name=orci-loop-valkey-${run_id}" | wc -l | tr -d ' ')
if [ "$survivors" != '0' ]; then
    say "Teardown incomplete: ${survivors} container(s) still present for ${run_id}"
    exit 7
fi

if [ "$keep_log" != '--keep-log' ] && [ -d "$run_dir" ]; then
    rm -rf "$run_dir"
fi

say "Environment ${run_id} torn down"
