#!/bin/sh
# Tears down an ephemeral app-under-test created by env-up.sh.
#
#   env-down.sh <run-id> [--keep-log]
#
# Exit: 0 everything gone (or already absent), 1 usage, 7 something survived teardown.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
STATE_ROOT="${LOOP_HOME}/state/envs"
COMPOSE_FILE="${LOOP_COMPOSE_FILE:-${LOOP_HOME}/compose-loop.yml}"

say() { printf '%s\n' "$*" >&2; }

[ $# -ge 1 ] || { say "Usage: env-down.sh <run-id> [--keep-log]"; exit 1; }

run_id="$1"
keep_log="${2:-}"
project="orci-loop-$(printf '%s' "$run_id" | tr '[:upper:]' '[:lower:]')"
run_dir="${STATE_ROOT}/${run_id}"

# The compose file interpolates these, so they must be set even to bring the project down.
ORCI_IMAGE="${ORCI_IMAGE:-unused}" ORCI_APP_PORT="${ORCI_APP_PORT:-0}" \
    docker compose -p "$project" -f "$COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true

survivors=$(docker ps -aq --filter "label=com.docker.compose.project=${project}" | wc -l | tr -d ' ')
if [ "$survivors" != '0' ]; then
    say "Teardown incomplete: ${survivors} container(s) still present for ${project}"
    docker ps -a --filter "label=com.docker.compose.project=${project}" \
        --format '  {{.Names}} {{.Status}}' >&2 || true
    exit 7
fi

if [ "$keep_log" != '--keep-log' ] && [ -d "$run_dir" ]; then
    rm -rf "$run_dir"
fi

say "Environment ${project} torn down"
