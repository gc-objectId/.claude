#!/bin/sh
# Brings up an isolated app-under-test: its own Postgres, its own Valkey, its own app port.
# Nothing is shared with the developer's 8080 instance, so runs cannot interfere with each other.
#
#   env-up.sh <run-id> <jar-path>
#
# Prints a JSON environment descriptor on stdout; diagnostics go to stderr.
# Exit: 0 up and healthy, 1 usage/error, 6 containers came up but the app never became healthy.
set -eu

STATE_ROOT="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}/state/envs"
PG_IMAGE="${PG_IMAGE:-postgres:14.5-alpine}"
VALKEY_IMAGE="${VALKEY_IMAGE:-valkey/valkey:8.1-alpine}"
APP_BOOT_TIMEOUT="${APP_BOOT_TIMEOUT:-420}"
DB_READY_TIMEOUT="${DB_READY_TIMEOUT:-90}"
REDIS_PASSWORD="${REDIS_PASSWORD:-loopdev}"

say() { printf '%s\n' "$*" >&2; }
die() { say "Error: $*"; exit 1; }

[ $# -eq 2 ] || { say "Usage: env-up.sh <run-id> <jar-path>"; exit 1; }

run_id="$1"
jar="$2"

printf '%s' "$run_id" | grep -qE '^[A-Za-z0-9._-]+$' || die "run-id '$run_id' must be alphanumeric/._-"
[ -f "$jar" ] || die "jar not found: $jar"
command -v docker >/dev/null 2>&1 || die "docker is not on PATH."
command -v java >/dev/null 2>&1 || die "java is not on PATH."

run_dir="${STATE_ROOT}/${run_id}"
mkdir -p "$run_dir"
app_log="${run_dir}/app.log"
pid_file="${run_dir}/app.pid"

pg_name="orci-loop-pg-${run_id}"
valkey_name="orci-loop-valkey-${run_id}"

free_port() {
    python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()'
}

# Containers are deliberately not --rm: on a failed boot their logs are the only evidence.
teardown_partial() {
    st=$?
    if [ "$st" -ne 0 ]; then
        say "Bringing down partial environment for ${run_id}"
        if [ -f "$pid_file" ]; then
            kill "$(cat "$pid_file")" 2>/dev/null || true
        fi
        docker rm -f "$pg_name" "$valkey_name" >/dev/null 2>&1 || true
    fi
    exit "$st"
}
trap teardown_partial EXIT

pg_port=$(free_port)
valkey_port=$(free_port)
app_port=$(free_port)

say "Starting Postgres on ${pg_port} and Valkey on ${valkey_port} for ${run_id}"
docker run -d --name "$pg_name" \
    -e POSTGRES_USER=orci -e POSTGRES_PASSWORD=orci \
    -p "127.0.0.1:${pg_port}:5432" "$PG_IMAGE" >/dev/null ||
    die "failed to start $pg_name"

# KEA is not optional: the app returns ConfigureRedisAction.NO_OP, so without keyspace
# notifications session expiry and destroy events silently stop firing.
docker run -d --name "$valkey_name" \
    -p "127.0.0.1:${valkey_port}:6379" "$VALKEY_IMAGE" \
    valkey-server --requirepass "$REDIS_PASSWORD" --notify-keyspace-events KEA >/dev/null ||
    die "failed to start $valkey_name"

waited=0
until docker exec "$pg_name" pg_isready -U orci -q 2>/dev/null; do
    waited=$((waited + 2))
    [ "$waited" -ge "$DB_READY_TIMEOUT" ] && die "Postgres not ready after ${DB_READY_TIMEOUT}s"
    sleep 2
done
say "Postgres ready after ${waited}s"

until docker exec "$valkey_name" valkey-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; do
    waited=$((waited + 2))
    [ "$waited" -ge "$DB_READY_TIMEOUT" ] && die "Valkey not ready after ${DB_READY_TIMEOUT}s"
    sleep 2
done

base_url="http://localhost:${app_port}"
say "Booting app on ${app_port} (log: ${app_log})"

# Plaintext values pass straight through Jasypt; only ENC(...) values get decrypted.
java -jar "$jar" \
    --spring.profiles.active=local \
    --server.port="$app_port" \
    --spring.datasource.url="jdbc:postgresql://localhost:${pg_port}/orci" \
    --spring.datasource.username=orci \
    --spring.datasource.password=orci \
    --spring.data.redis.host=localhost \
    --spring.data.redis.port="$valkey_port" \
    --spring.data.redis.password="$REDIS_PASSWORD" \
    --allowed-origins="$base_url" \
    --url="$base_url" \
    >"$app_log" 2>&1 &

printf '%s\n' "$!" >"$pid_file"

health_ok() {
    python3 - "$base_url" <<'PY'
import json, sys, urllib.request
try:
    with urllib.request.urlopen(sys.argv[1] + "/actuator/health", timeout=5) as r:
        sys.exit(0 if json.load(r).get("status") == "UP" else 1)
except Exception:
    sys.exit(1)
PY
}

boot_waited=0
until health_ok; do
    if ! kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        say "App process exited during boot — last lines of ${app_log}:"
        tail -25 "$app_log" >&2 || true
        exit 6
    fi
    boot_waited=$((boot_waited + 5))
    if [ "$boot_waited" -ge "$APP_BOOT_TIMEOUT" ]; then
        say "App never reported UP within ${APP_BOOT_TIMEOUT}s — last lines of ${app_log}:"
        tail -25 "$app_log" >&2 || true
        exit 6
    fi
    sleep 5
done

say "App healthy after ${boot_waited}s at ${base_url}"

jq -nc \
    --arg run_id "$run_id" --arg jar "$jar" --arg base_url "$base_url" \
    --arg pg "$pg_name" --arg valkey "$valkey_name" --arg log "$app_log" \
    --argjson app_port "$app_port" --argjson pg_port "$pg_port" --argjson valkey_port "$valkey_port" \
    --argjson boot_seconds "$boot_waited" \
    '{run_id: $run_id, jar: $jar, base_url: $base_url, app_port: $app_port,
      pg: {container: $pg, port: $pg_port}, valkey: {container: $valkey, port: $valkey_port},
      app_log: $log, boot_seconds: $boot_seconds}' | tee "${run_dir}/env.json"
