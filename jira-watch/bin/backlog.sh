#!/bin/sh
# Lists tickets currently sitting in the target column, oldest first — the level-triggered
# counterpart to watch.sh, which only sees arrivals and so misses anything that landed while
# nobody was looking.
#
#   backlog.sh [--limit N] [--all]
#
# Prints one ticket key per line. Skips tickets already in flight (a worktree or branch exists)
# and, unless --all is given, tickets this pipeline has already run and that have not changed
# since — otherwise every sweep re-validates the same refusals forever.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.claude/bin}"
RESULTS="${LOOP_HOME}/state/results"
WORKTREE_ROOT="${WORKTREE_ROOT:-$HOME/dev/worktrees}"
ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"
PROJECT="${JIRA_WATCH_PROJECT:-OR}"
STATUS="${JIRA_WATCH_STATUS:-Ready for Testing}"

. "${CLAUDE_BIN}/jira.sh"

limit=0
all=''
while [ $# -gt 0 ]; do
    case "$1" in
        --limit) shift; limit="${1:-0}" ;;
        --all) all=1 ;;
        *) printf 'usage: backlog.sh [--limit N] [--all]\n' >&2; exit 1 ;;
    esac
    shift
done

# Both statuses on purpose. A ticket left in Testing by a run that died is stranded — it would
# otherwise never be offered again — and the worktree/branch/running guards below are what stop us
# stomping a ticket someone is genuinely working.
# Oldest first: a ticket that has waited two weeks earns the slot over one that landed this morning.
jql="project = \"${PROJECT}\" AND sprint in openSprints() AND status IN (\"${STATUS}\", \"Testing\") ORDER BY created ASC"

emitted=0
jira_search_keys "$jql" | while IFS="$(printf '\t')" read -r key _summary; do
    [ -n "$key" ] || continue

    if [ -n "$(find "$WORKTREE_ROOT" -maxdepth 1 -name "${key}-*" -print -quit 2>/dev/null)" ]; then
        printf 'skip %s: worktree exists\n' "$key" >&2
        continue
    fi
    if git -C "$ORCI_ROOT" branch --list "*${key}-*" 2>/dev/null | grep -q .; then
        printf 'skip %s: local branch exists\n' "$key" >&2
        continue
    fi

    if [ -z "$all" ] && [ -f "${RESULTS}/${key}/result.json" ]; then
        prev=$(jq -r '.disposition // "?"' "${RESULTS}/${key}/result.json" 2>/dev/null || echo '?')
        case "$prev" in
            running)
                # A killed run leaves "running" behind forever, which would bar the ticket for
                # good. Anything older than a session could possibly take is stale, not live.
                _at=$(jq -r '.at // ""' "${RESULTS}/${key}/result.json" 2>/dev/null || true)
                _age=999999
                if [ -n "$_at" ]; then
                    # -u so the Z timestamp is read as UTC; without it the local offset
                    # alone exceeds STALE_RUN_SECONDS and every live run looks stale.
                    _epoch=$(date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$_at" '+%s' 2>/dev/null || echo 0)
                    [ "$_epoch" -gt 0 ] && _age=$(( $(date '+%s') - _epoch ))
                fi
                if [ "$_age" -lt "${STALE_RUN_SECONDS:-5400}" ]; then
                    printf 'skip %s: a run is in progress\n' "$key" >&2
                    continue
                fi
                printf 'note %s: stale running record (%ss old), offering again\n' "$key" "$_age" >&2
                ;;
            admitted | admitted_with_caveats) printf 'skip %s: already admitted\n' "$key" >&2; continue ;;
            *)
                # Re-run only if the ticket itself moved on: a new comment or a status change is a
                # human responding to the last refusal. Otherwise the outcome would be identical.
                prev_comments=$(jq -r '.baseline.comments // -1' "${RESULTS}/${key}/runner.json" 2>/dev/null || echo -1)
                now_comments=$(jira_comment_count "$key" 2>/dev/null || echo -1)
                if [ "$prev_comments" -ge 0 ] && [ "$now_comments" = "$prev_comments" ]; then
                    printf 'skip %s: last run was %s and nothing changed since\n' "$key" "$prev" >&2
                    continue
                fi
                ;;
        esac
    fi

    printf '%s\n' "$key"
    emitted=$((emitted + 1))
    [ "$limit" -gt 0 ] && [ "$emitted" -ge "$limit" ] && break
done
