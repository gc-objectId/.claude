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
SKIP_FILE="${LOOP_HOME}/state/skip"
# Reserved work validates but never writes, so a sweep slot spent on it moves nothing. Run one by
# name when the evidence is actually wanted.
LOOP_RESERVED_PATTERN="${LOOP_RESERVED_PATTERN:-^analytics}"
INCLUDE_RESERVED="${LOOP_INCLUDE_RESERVED:-}"
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

# Testing is included so a ticket stranded by a dead run is still reachable; the guards below
# are what prevent stomping live work.
assignee_clause=''
[ -n "$INCLUDE_RESERVED" ] || assignee_clause=' AND (assignee IS EMPTY OR assignee = currentUser())'
jql="project = \"${PROJECT}\" AND sprint in openSprints() AND status IN (\"${STATUS}\", \"Testing\")${assignee_clause} ORDER BY created ASC"

# Subtasks never match `sprint in openSprints()`, so reach them by parent instead.
candidates=$(jira_search_keys "$jql")

# Parents are collected regardless of their own status: OR-2790 sat in Ready for Testing under a
# parent still In Progress, so keying off parents that were themselves ready missed it entirely.
parents=$(jira_search_keys "project = \"${PROJECT}\" AND sprint in openSprints()" | cut -f1 | paste -sd, - || true)
if [ -n "$parents" ]; then
    sub_jql="project = \"${PROJECT}\" AND parent in (${parents}) AND status IN (\"${STATUS}\", \"Testing\") ORDER BY created ASC"
    subs=$(jira_search_keys "$sub_jql" || true)
    [ -n "$subs" ] && candidates=$(printf '%s\n%s\n' "$candidates" "$subs")
fi

emitted=0
printf '%s\n' "$candidates" | awk 'NF && !seen[$1]++' | while IFS="$(printf '\t')" read -r key _summary; do
    [ -n "$key" ] || continue

    # Tickets deliberately taken out of the sweep by unblock.sh — usually not locally validatable.
    if [ -f "${SKIP_FILE}" ] && grep -qxF "$key" "${SKIP_FILE}"; then
        printf 'skip %s: on the skip list\n' "$key" >&2
        continue
    fi

    if [ -z "$INCLUDE_RESERVED" ] && printf '%s' "$_summary" | grep -qiE "$LOOP_RESERVED_PATTERN"; then
        printf 'skip %s: reserved for another reviewer\n' "$key" >&2
        continue
    fi

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
                # Older than any session could run means the record is stale, not live.
                _at=$(jq -r '.at // ""' "${RESULTS}/${key}/result.json" 2>/dev/null || true)
                _age=999999
                if [ -n "$_at" ]; then
                    # -u or the Z timestamp is read as local time.
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
            # Infrastructure failures say nothing about the ticket, so retry without waiting for it
            # to change. Only a real verdict (refused, no_merged_pr) waits for new information.
            aborted | env_failed | session_timeout | stale_build)
                printf 'note %s: last run was %s, offering again\n' "$key" "$prev" >&2
                ;;
            *)
                # Unchanged since the last failure means the outcome would be identical.
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
