#!/bin/sh
# Brings up an isolated app-under-test for one validation run: its own compose project,
# network, Postgres, Valkey and app port. Nothing is shared with the developer's instance.
#
#   env-up.sh <run-id> <image>
#
# Prints a JSON environment descriptor on stdout; diagnostics go to stderr.
# Exit: 0 up and healthy, 1 usage/error, 6 came up but the app never became healthy.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
STATE_ROOT="${LOOP_HOME}/state/envs"
COMPOSE_FILE="${LOOP_COMPOSE_FILE:-${LOOP_HOME}/compose-loop.yml}"
APP_BOOT_TIMEOUT="${APP_BOOT_TIMEOUT:-600}"
LOOP_USER="${LOOP_USER:-loopuser}"
LOOP_USER_TENANTS="${LOOP_USER_TENANTS:-[\"demo-demo\",\"mayo-mayo\",\"mgb-mgh\",\"mgb-icsnh\"]}"

say() { printf '%s\n' "$*" >&2; }
die() { say "Error: $*"; exit 1; }

[ $# -eq 2 ] || { say "Usage: env-up.sh <run-id> <image>"; exit 1; }

run_id="$1"
image="$2"

printf '%s' "$run_id" | grep -qE '^[A-Za-z0-9._-]+$' || die "run-id '$run_id' must be alphanumeric/._-"
[ -f "$COMPOSE_FILE" ] || die "compose file not found: $COMPOSE_FILE"
command -v docker >/dev/null 2>&1 || die "docker is not on PATH."
docker image inspect "$image" >/dev/null 2>&1 || die "image not present locally: $image"

# Compose rejects uppercase project names, and run-ids are ticket keys.
project="orci-loop-$(printf '%s' "$run_id" | tr '[:upper:]' '[:lower:]')"
run_dir="${STATE_ROOT}/${run_id}"
mkdir -p "$run_dir"

free_port() {
    python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()'
}

app_port=$(free_port)
base_url="http://localhost:${app_port}"

compose() {
    ORCI_IMAGE="$image" ORCI_APP_PORT="$app_port" \
        docker compose -p "$project" -f "$COMPOSE_FILE" "$@"
}

teardown_partial() {
    st=$?
    if [ "$st" -ne 0 ]; then
        say "Bringing down partial environment ${project}"
        compose logs --no-color --tail 40 orci >"${run_dir}/boot-failure.log" 2>&1 || true
        compose down -v --remove-orphans >/dev/null 2>&1 || true
    fi
    exit "$st"
}
trap teardown_partial EXIT

say "Starting ${project} (image ${image}, app port ${app_port})"
# Dependency health gates the app container, so this returns once Postgres and Valkey are ready.
compose up -d --wait --wait-timeout 120 >&2 ||
    die "compose up failed for ${project}"

# /actuator/health is behind Spring Security here (403), and Tomcat starts serving before
# ApplicationRunner finishes importing clinical config — so the only signal that means
# "fully initialised" is Spring's own startup line, which logs after every SmartLifecycle bean.
health_ok() {
    compose logs --no-color orci 2>/dev/null | grep -q 'Started OrciApplication in'
}

app_running() {
    [ -n "$(compose ps -q orci 2>/dev/null)" ] &&
        [ "$(docker inspect -f '{{.State.Running}}' "$(compose ps -q orci)" 2>/dev/null)" = 'true' ]
}

waited=0
until health_ok; do
    if ! app_running; then
        say "App container stopped during boot — last lines:"
        compose logs --no-color --tail 30 orci >&2 || true
        exit 6
    fi
    waited=$((waited + 5))
    if [ "$waited" -ge "$APP_BOOT_TIMEOUT" ]; then
        say "App never reported UP within ${APP_BOOT_TIMEOUT}s — last lines:"
        compose logs --no-color --tail 30 orci >&2 || true
        exit 6
    fi
    sleep 5
done

# The seeded ROLE_USER has an empty allowed_tenants, so without this every session has to grant
# itself tenant access before it can touch the UI or the user-facing API.
# stdin must be closed explicitly: `compose exec` attaches stdin even with -T, which suspends the
# whole pipeline with SIGTTIN when this runs as a background job.
if compose exec -T postgres psql -U orci -d orci -q -v ON_ERROR_STOP=1 \
    -c "update public.users set allowed_tenants = '${LOOP_USER_TENANTS}'::json where username = '${LOOP_USER}'" \
    </dev/null >/dev/null 2>&1; then
    say "Granted ${LOOP_USER} access to ${LOOP_USER_TENANTS}"
else
    say "WARNING: could not grant tenant access to ${LOOP_USER}; UI and user-facing API work will fail."
fi

startup_seconds=$(compose logs --no-color orci 2>/dev/null |
    sed -n 's/.*Started OrciApplication in \([0-9.]*\) seconds.*/\1/p' | tail -1)
say "App fully initialised in ${startup_seconds:-?}s at ${base_url}"

jq -nc \
    --arg run_id "$run_id" --arg project "$project" --arg image "$image" \
    --arg base_url "$base_url" --argjson app_port "$app_port" \
    --argjson startup_seconds "${startup_seconds:-null}" --arg compose_file "$COMPOSE_FILE" \
    '{run_id: $run_id, project: $project, image: $image, base_url: $base_url,
      app_port: $app_port, startup_seconds: $startup_seconds, compose_file: $compose_file}' |
    tee "${run_dir}/env.json"
