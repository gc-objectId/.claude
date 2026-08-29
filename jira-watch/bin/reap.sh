#!/bin/sh
# Clears the wreckage a hard-killed run leaves behind, so the next sweep can retry the ticket.
#
#   reap.sh            report what is strandeed, change nothing (default)
#   reap.sh --apply    tear the stranded ones down
#
# A worktree whose ticket the loop has run, with no live run and nothing of value in it, blocks
# that ticket forever: backlog.sh skips it with "worktree exists". This reclaims exactly those.
#
# Will not touch a worktree unless ALL of the following hold:
#   - no live process has its cwd inside it
#   - a results directory exists for the ticket, i.e. the loop ran it at some point
#   - no loop runner is currently mid-sweep
#   - the branch has no commits of its own beyond origin/main
#   - the working tree has no modified or untracked files
#
# The cwd check is the one that matters. state/results/<ticket>/ persists forever, so a hand-made
# worktree for a ticket the loop ran weeks ago looks stranded the moment it is clean and
# uncommitted — which is exactly what a session you started an hour ago looks like.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.claude/bin}"
RESULTS="${LOOP_HOME}/state/results"
WORKTREE_ROOT="${WORKTREE_ROOT:-$HOME/dev/worktrees}"
ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"

apply=''
[ "${1:-}" = '--apply' ] && apply=1

if pgrep -f 'jira-watch/bin/runner.sh' >/dev/null 2>&1; then
    printf 'A run is in progress — refusing to reap anything.\n' >&2
    exit 0
fi

# One lsof for every process's cwd, rather than one per candidate.
CWDS=$(lsof -w -d cwd -F pn 2>/dev/null |
    awk '/^p/{pid=substr($0,2)} /^n/{print pid "\t" substr($0,2)}' || true)

in_use() {
    printf '%s\n' "$CWDS" | awk -F'\t' -v d="$1" '
        $2 == d || index($2, d "/") == 1 { print $1; found=1; exit }
        END { exit !found }'
}

found=0
for dir in "$WORKTREE_ROOT"/OR-*; do
    [ -d "$dir" ] || continue
    ticket=$(basename "$dir" | sed -E 's/^(OR-[0-9]+).*/\1/')

    holder=$(in_use "$dir") && {
        printf 'keep   %-12s in use — pid %s has its cwd in there\n' "$ticket" "$holder"
        continue
    }

    [ -d "${RESULTS}/${ticket}" ] || continue

    branch=$(git -C "$dir" branch --show-current 2>/dev/null || true)
    dirty=$(git -C "$dir" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    ahead=0
    [ -n "$branch" ] && ahead=$(git -C "$dir" rev-list --count "origin/main..HEAD" 2>/dev/null || echo 0)

    if [ "$dirty" != '0' ] || [ "$ahead" != '0' ]; then
        printf 'keep   %-12s %s commits ahead, %s dirty files — has work in it\n' "$ticket" "$ahead" "$dirty"
        continue
    fi

    found=$((found + 1))
    if [ -n "$apply" ]; then
        if "${CLAUDE_BIN}/worktree-teardown.sh" "$dir" >/dev/null 2>&1; then
            printf 'reaped %-12s %s\n' "$ticket" "$dir"
        else
            printf 'FAILED %-12s %s — tear down by hand\n' "$ticket" "$dir"
        fi
        "${CLAUDE_BIN}/env-down.sh" "$ticket" >/dev/null 2>&1 || true
    else
        printf 'stranded %-10s %s\n' "$ticket" "$dir"
    fi
done

if [ "$found" -eq 0 ]; then
    printf 'Nothing stranded.\n'
elif [ -z "$apply" ]; then
    printf '\n%s stranded. Re-run with --apply to clear them.\n' "$found"
fi
