#!/bin/sh
# Detects tickets arriving in the Ready for Testing column and enqueues them for the runner.
#
#   watch.sh --seed     record every ticket currently in the column, enqueue nothing
#   watch.sh            poll: enqueue arrivals not already seen (dry-run unless DRY_RUN=0)
set -eu

BASE="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
. "${CLAUDE_BIN:-$HOME/.claude/bin}/jira.sh"

STATE="$BASE/state"
SEEN="$STATE/seen"
QUEUE="$STATE/queue"
LOCK="$STATE/watch.lock"
LOG="$BASE/log/watch.log"

PROJECT="${JIRA_WATCH_PROJECT:-OR}"
STATUS="${JIRA_WATCH_STATUS:-Ready for Testing}"
# Wider than the poll interval on purpose: a closed laptop must not drop arrivals. The seen-file dedupes.
WINDOW="${JIRA_WATCH_WINDOW:--24h}"
ASSIGNEE_CLAUSE="${JIRA_WATCH_ASSIGNEE:-}"
DRY_RUN="${JIRA_WATCH_DRY_RUN:-1}"
WORKTREE_ROOT="${JIRA_WATCH_WORKTREE_ROOT:-$HOME/dev/worktrees}"

mkdir -p "$STATE" "$BASE/log"
touch "$SEEN" "$QUEUE"

log() {
    printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >>"$LOG"
}

for dep in jq curl security; do
    command -v "$dep" >/dev/null 2>&1 || { log "FATAL missing dependency: $dep"; exit 1; }
done

if ! mkdir "$LOCK" 2>/dev/null; then
    log "another watch run holds the lock; exiting"
    exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT INT TERM

seen() {
    grep -qxF "$1" "$SEEN" 2>/dev/null
}

# An existing worktree or branch means the ticket is in flight.
in_flight() {
    if [ -n "$(find "$WORKTREE_ROOT" -maxdepth 1 -name "$1-*" -print -quit 2>/dev/null)" ]; then
        return 0
    fi
    if git -C "$HOME/dev/orci" branch --list "*$1-*" 2>/dev/null | grep -q .; then
        return 0
    fi
    return 1
}

# The project key must stay quoted — a bare OR is a JQL keyword and the query 400s.
if [ "${1:-}" = '--seed' ]; then
    jql="project = \"$PROJECT\" AND status = \"$STATUS\""
    log "SEED query: $jql"
    jira_search_keys "$jql" | while IFS="$(printf '\t')" read -r key summary; do
        [ -n "$key" ] || continue
        seen "$key" || printf '%s\n' "$key" >>"$SEEN"
        log "SEED  $key  $summary"
    done
    log "SEED complete; seen-file holds $(wc -l <"$SEEN" | tr -d ' ') keys"
    exit 0
fi

jql="project = \"$PROJECT\" AND sprint in openSprints()"
# Both clauses are needed: CHANGED TO alone also matches tickets that have since moved on to Done.
jql="$jql AND status = \"$STATUS\" AND status CHANGED TO \"$STATUS\" AFTER $WINDOW"
[ -n "$ASSIGNEE_CLAUSE" ] && jql="$jql AND $ASSIGNEE_CLAUSE"
jql="$jql ORDER BY updated ASC"

log "POLL  dry_run=$DRY_RUN  jql: $jql"

jira_search_keys "$jql" | while IFS="$(printf '\t')" read -r key summary; do
    [ -n "$key" ] || continue

    if seen "$key"; then
        continue
    fi

    if in_flight "$key"; then
        log "SKIP  $key  already has a worktree or branch"
        [ "$DRY_RUN" = '0' ] && printf '%s\n' "$key" >>"$SEEN"
        continue
    fi

    slug=$(jira_slug "$summary")

    if [ "$DRY_RUN" = '0' ]; then
        printf '%s\t%s\t%s\n' "$key" "$slug" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >>"$QUEUE"
        printf '%s\n' "$key" >>"$SEEN"
        log "QUEUE $key  slug=$slug"
    else
        log "WOULD-QUEUE $key  slug=$slug"
    fi
done

log "POLL  complete"
