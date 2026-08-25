#!/bin/sh
# Drives one ticket through validation: status recheck, freshness, worktree, ephemeral env,
# unattended session, gate. Writes a result record for the digest and cleans up after itself.
#
#   runner.sh <ticket> [--keep] [--commit]
#
#   --keep     leave the worktree and environment up afterwards for inspection
#   --commit   let the gate actually write to Jira (default is dry-run)
#
# Exit: 0 ran to a decision (admitted or refused), 1 setup error, 9 aborted before validating.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.claude/bin}"
RESULTS="${LOOP_HOME}/state/results"
LOG="${LOOP_HOME}/log/runner.log"
PROMPT_TEMPLATE="${LOOP_HOME}/prompts/validate.md"
LOOP_USER="${LOOP_USER:-loopuser}"
# Extended regex matched against the issue summary. A match means validate but never write.
LOOP_RESERVED_PATTERN="${LOOP_RESERVED_PATTERN:-^Analytics:}"
JIRA_ACCOUNT_ID="${JIRA_ACCOUNT_ID:-712020:eb570e67-6608-41f7-877b-09ca17738171}"
LOOP_USER_PASSWORD="${LOOP_USER_PASSWORD:-LoopValidate1!}"
SESSION_TIMEOUT="${SESSION_TIMEOUT:-2700}"

. "${CLAUDE_BIN}/jira.sh"

mkdir -p "$RESULTS" "${LOOP_HOME}/log"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG" >&2; }
die() { log "ERROR $*"; exit 1; }

[ $# -ge 1 ] || { log "Usage: runner.sh <ticket> [--keep] [--commit]"; exit 1; }

ticket="$1"
shift
keep=''
commit=''
for arg in "$@"; do
    case "$arg" in
        --keep) keep=1 ;;
        --commit) commit='--commit' ;;
        *) die "unknown argument: $arg" ;;
    esac
done

printf '%s' "$ticket" | grep -qE '^[A-Z][A-Z0-9]*-[0-9]+$' || die "'$ticket' is not a Jira key."
[ -f "$PROMPT_TEMPLATE" ] || die "missing prompt template ${PROMPT_TEMPLATE}"

run_id="$ticket"
run_dir="${RESULTS}/${run_id}"
mkdir -p "$run_dir"
stamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# Previous attempts are kept: a session must be able to see whether this ticket has been run
# before and what came of it, or it redoes work and re-litigates settled questions.
if [ -f "${run_dir}/result.json" ]; then
    cat "${run_dir}/result.json" >>"${run_dir}/history.jsonl"
fi

# Stamped immediately so a hard failure cannot leave a previous run's record looking like this
# run's outcome in the digest.
jq -nc --arg t "$ticket" --arg at "$stamp" \
    '{ticket: $t, disposition: "running", detail: "run in progress", at: $at}' >"${run_dir}/result.json"
rm -f "${run_dir}/session.json"

record() {
    jq -nc --arg t "$ticket" --arg d "$1" --arg detail "$2" --arg at "$stamp" \
        '{ticket: $t, disposition: $d, detail: $detail, at: $at}' >"${run_dir}/result.json"
    cat "${run_dir}/result.json"

    # Outcomes that will not resolve themselves get pushed straight to Slack. The digest is
    # pull-only, so without this a blocked ticket waits until someone thinks to look. Successes
    # stay quiet on purpose: a 25-ticket sweep that pings per success trains you to ignore it.
    case "$1" in
        running | admitted) ;;
        *)
            _blockers=$(jq -r '(.blockers // []) | map("  - " + .) | join("\n")' \
                "${run_dir}/session.json" 2>/dev/null || true)
            "${CLAUDE_BIN}/notify.sh" "$(printf '%s needs you — %s\n%s\n%s' \
                "$ticket" "$1" "$2" "${_blockers}")" >/dev/null 2>&1 || true
            ;;
    esac
}

# Status is rechecked here, not taken from the queue: a ticket can move between detection and
# now, and an IMPLEMENT-mode ticket must never be picked up by an unattended session.
status=$(jira_issue_status "$ticket" 2>/dev/null || true)
log "${ticket} status is '${status:-unknown}'"
case "$status" in
    'Ready for Testing' | 'Testing') ;;
    '') record aborted "could not read Jira status"; exit 9 ;;
    *) record aborted "status is '${status}', not a validate-mode status"; exit 9 ;;
esac

summary=$(jira_issue_summary "$ticket" 2>/dev/null || true)

# Some work belongs to a specific reviewer, and silently closing their ticket is worse than not
# running at all. A reserved ticket is still validated in full — the evidence is just kept local
# and every Jira write is dropped, so the run is an offer rather than a decision.
reserved=''
if printf '%s' "$summary" | grep -qE "$LOOP_RESERVED_PATTERN"; then
    reserved=1
    commit=''
    log "${ticket} matches the reserved pattern (${LOOP_RESERVED_PATTERN}) — validating without writing to Jira"
fi

# Moving to Testing marks the ticket as picked up. It also acts as the in-flight lock: watch.sh
# only matches tickets currently in Ready for Testing, so this stops a second run being queued.
if [ "$status" = 'Ready for Testing' ]; then
    if [ -n "$commit" ]; then
        if jira_transition_to "$ticket" Testing; then
            log "${ticket} moved to Testing"
        else
            record aborted "could not move ${ticket} to Testing"
            exit 9
        fi
    else
        log "dry-run: would move ${ticket} to Testing"
    fi
fi

# Assigned at pickup and left that way through Done, so the board shows who owns the outcome.
# Outside the transition block on purpose: a ticket already sitting in Testing still needs owning.
# Reserved tickets skip this with everything else, since they belong to another reviewer.
if [ -n "$commit" ]; then
    if jira_assign "$ticket" "$JIRA_ACCOUNT_ID"; then
        log "${ticket} assigned to the configured account"
    else
        log "WARNING could not assign ${ticket}; continuing"
    fi
fi

# Snapshot taken after the runner's own transition, so anything that moves afterwards was not this
# script. Tool denial cannot be the boundary — the session runs as Ryan with a reachable keychain —
# so the gate detects tampering instead, and this is what it compares against.
expected_status=$(jira_issue_status "$ticket" 2>/dev/null || true)
baseline_comments=$(jira_comment_count "$ticket" 2>/dev/null || echo -1)
log "baseline: status='${expected_status}' comments=${baseline_comments}"

log "Building image from origin/main"
build=$("${CLAUDE_BIN}/build-image.sh") || die "image build failed"
image=$(printf '%s' "$build" | jq -r '.image')
sha=$(printf '%s' "$build" | jq -r '.sha')
log "image=${image} sha=${sha}"

# Nothing to validate means no environment is worth booting.
fresh=$("${CLAUDE_BIN}/freshness.sh" "$ticket" "$sha" 2>/dev/null) && fresh_rc=0 || fresh_rc=$?
case "$fresh_rc" in
    0) ;;
    5) log "${ticket} has no merged PR — disposing without booting an environment"
       record no_merged_pr "no merged PR within the search window; needs a human disposition"
       exit 0 ;;
    4) log "${ticket} fix is not in the build"
       record stale_build "build ${sha} does not contain the ticket's merge commit"
       exit 0 ;;
    *) die "freshness check errored (rc=${fresh_rc})" ;;
esac

slug=$(jira_slug "$summary")
log "slug=${slug}"

worktree=$("${CLAUDE_BIN}/worktree-create.sh" "$ticket" "$slug") || {
    rc=$?
    [ "$rc" -eq 3 ] && { record aborted "a worktree or branch for ${ticket} already exists"; exit 9; }
    die "worktree creation failed (rc=${rc})"
}
log "worktree=${worktree}"

cleanup() {
    st=$?
    if [ -z "$keep" ]; then
        "${CLAUDE_BIN}/env-down.sh" "$run_id" --keep-log >/dev/null 2>&1 || true
        "${CLAUDE_BIN}/worktree-teardown.sh" "$worktree" >/dev/null 2>&1 || true
    else
        log "--keep: leaving ${worktree} and environment ${run_id} in place"
    fi
    exit "$st"
}
trap cleanup EXIT

env_json=$("${CLAUDE_BIN}/env-up.sh" "$run_id" "$image") || {
    env_rc=$?
    case "$env_rc" in
        6) detail="containers started but the app never reported UP" ;;
        *) detail="env-up failed before the app started (rc=${env_rc}) — see the runner log" ;;
    esac
    record env_failed "$detail"
    exit 0
}
base_url=$(printf '%s' "$env_json" | jq -r '.base_url')
project=$(printf '%s' "$env_json" | jq -r '.project')
log "app under test at ${base_url}"

jq -nc --arg t "$ticket" --arg image "$image" --arg sha "$sha" --arg url "$base_url" \
    --arg wt "$worktree" --arg at "$stamp" --argjson fresh "$fresh" \
    --arg expected_status "$expected_status" --argjson baseline_comments "$baseline_comments" \
    '{ticket: $t, mode: "VALIDATE", image: $image, sha: $sha, base_url: $url,
      worktree: $wt, started_at: $at, freshness: $fresh,
      baseline: {status: $expected_status, comments: $baseline_comments}}' >"${run_dir}/runner.json"

session_json="${run_dir}/session.json"
scratch_dir="${run_dir}/scratch"
mkdir -p "$scratch_dir"

# The session gets Jira context as a file rather than Jira access. It cannot then duplicate work
# another run already did, and it needs no Jira credentials to read the ticket — which is what
# makes a credential-less sandbox viable later.
context_file="${run_dir}/context.md"
{
    jira_issue_context "$ticket" || printf 'Could not fetch ticket context.\n'
    if [ -s "${run_dir}/history.jsonl" ]; then
        printf '\n## Previous automated runs of this ticket\n\n'
        jq -r '"- \(.at)  \(.disposition): \(.detail)"' "${run_dir}/history.jsonl"
        printf '\nTreat these as work already done. Do not repeat a settled conclusion; if a\n'
        printf 'previous run was blocked, start from that blocker rather than from scratch.\n'
    fi
} >"$context_file"
log "wrote ticket context ($(wc -l <"$context_file" | tr -d ' ') lines)"
prompt=$(sed \
    -e "s|__TICKET__|${ticket}|g" \
    -e "s|__BASE_URL__|${base_url}|g" \
    -e "s|__SHA__|${sha}|g" \
    -e "s|__LOOP_USER__|${LOOP_USER}|g" \
    -e "s|__LOOP_USER_PASSWORD__|${LOOP_USER_PASSWORD}|g" \
    -e "s|__SESSION_JSON__|${session_json}|g" \
    -e "s|__SCRATCH_DIR__|${scratch_dir}|g" \
    -e "s|__CONTEXT_FILE__|${context_file}|g" \
    "$PROMPT_TEMPLATE")

log "Starting unattended session (log: ${run_dir}/session.log)"
# The Jira write tools are denied at the process level so the gate, not the model, owns the
# comment and the transition.
( cd "$worktree" && exec claude -p "$prompt" \
    --permission-mode bypassPermissions \
    --disallowed-tools \
        'mcp__claude_ai_Atlassian__*' \
        mcp__claude_ai_Atlassian__transitionJiraIssue \
        mcp__claude_ai_Atlassian__addCommentToJiraIssue \
        mcp__claude_ai_Atlassian__editJiraIssue \
        mcp__claude_ai_Atlassian__createJiraIssue \
    </dev/null >"${run_dir}/session.log" 2>&1 ) &
session_pid=$!

# A session emits nothing until it exits, so without a heartbeat a healthy 20-minute run and a
# hung one look identical in the log. The request count is the part that proves actual work.
waited=0
while kill -0 "$session_pid" 2>/dev/null; do
    waited=$((waited + 15))
    if [ $((waited % 300)) -eq 0 ]; then
        _reqs=$(docker logs "${project}-orci-1" 2>&1 |
            grep -cE 'Unauthorized request|Rule context|Rule evaluated' 2>/dev/null || echo '?')
        _appstate='up'
        docker inspect -f '{{.State.Running}}' "${project}-orci-1" 2>/dev/null | grep -q true ||
            _appstate='DOWN'
        log "  … ${ticket} still running (${waited}s elapsed, ${_reqs} app requests, app ${_appstate})"
    fi
    if [ "$waited" -ge "$SESSION_TIMEOUT" ]; then
        log "session exceeded ${SESSION_TIMEOUT}s — killing it"
        kill -9 "$session_pid" 2>/dev/null || true
        record session_timeout "session ran past ${SESSION_TIMEOUT}s without finishing"
        exit 0
    fi
    sleep 15
done
log "session finished after ~${waited}s"

# Captured before teardown: the gate verifies the red check against this, and container logs die
# with the container.
docker logs "${project}-orci-1" >"${run_dir}/app.log" 2>&1 || true
log "captured $(wc -l <"${run_dir}/app.log" | tr -d ' ') lines of application log"

gate_out=$("${CLAUDE_BIN}/gate.sh" "$run_dir" $commit 2>>"$LOG") && gate_rc=0 || gate_rc=$?
verdict=$(jq -r '.verdict // "none"' "$session_json" 2>/dev/null || echo none)

if [ "$gate_rc" -eq 0 ] && [ -n "$reserved" ]; then
    record reserved "verdict=${verdict}; reserved for another reviewer — validated locally, nothing posted, ticket untouched"
elif [ "$gate_rc" -eq 0 ]; then
    _caveats=$(jq -r '(.caveats // []) | map("  - " + .) | join("\n")' "$session_json" 2>/dev/null || true)
    _how=$(printf '%s' "$gate_out" | jq -r 'if .dry_run then "dry-run, nothing posted" else "posted and transitioned" end')
    if [ -n "$_caveats" ]; then
        # Closed, but with a stated limit on how far the validation reached. A distinct disposition
        # is what gets it into Slack and to the top of the digest instead of vanishing into the
        # pile of successes.
        record admitted_with_caveats "verdict=${verdict}; ${_how}; caveats:
${_caveats}"
    else
        record admitted "verdict=${verdict}; ${_how}"
    fi
else
    record refused "verdict=${verdict}; $(printf '%s' "$gate_out" | jq -r '.reason // "gate refused"')"
fi
