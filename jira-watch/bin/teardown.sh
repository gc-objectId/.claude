#!/bin/sh
# The last SOP step: after a PR merges, remove the worktree and close the ticket out.
#
#   teardown.sh <TICKET>
#
# Refuses unless a merged PR for the ticket actually exists — tearing down on the assumption that
# something merged is how branches get deleted before their work lands.
#
# Exit: 0 done, 1 usage/error, 2 nothing merged, 3 worktree survived teardown.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.claude/bin}"
ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"
WORKTREE_ROOT="${WORKTREE_ROOT:-$HOME/dev/worktrees}"

. "${CLAUDE_BIN}/jira.sh"

say() { printf '%s\n' "$*" >&2; }

ticket="${1:?usage: teardown.sh <TICKET>}"
printf '%s' "$ticket" | grep -qE '^[A-Z][A-Z0-9]*-[0-9]+$' || { say "not a Jira key: $ticket"; exit 1; }

repo=$(git -C "$ORCI_ROOT" remote get-url origin |
    sed -e 's#^git@github.com:##' -e 's#^https://github.com/##' -e 's#\.git$##')

merged=$(gh pr list --repo "$repo" --search "$ticket" --state merged --limit 10 \
    --json number,title,mergedAt,body 2>/dev/null |
    jq -r --arg t "$ticket" '[.[] | select((.title | test($t)) or ((.body // "") | test("(?i)(fixes|closes|resolves)\\s+" + $t)))] | .[0] // empty')

if [ -z "$merged" ]; then
    say "No merged PR references ${ticket} — refusing to tear anything down."
    say "If it merged without referencing the key, tear down by hand."
    exit 2
fi
pr_num=$(printf '%s' "$merged" | jq -r '.number')
pr_url="https://github.com/${repo}/pull/${pr_num}"
say "PR #${pr_num} merged $(printf '%s' "$merged" | jq -r '.mergedAt' | cut -c1-10)"

wt=$(find "$WORKTREE_ROOT" -maxdepth 1 -name "${ticket}-*" -print -quit 2>/dev/null || true)
if [ -n "$wt" ]; then
    if "${CLAUDE_BIN}/worktree-teardown.sh" "$wt"; then
        say "worktree removed"
    else
        rc=$?
        say "worktree teardown returned ${rc} — resolve it by hand"
        exit 3
    fi
else
    say "no worktree for ${ticket} (already gone)"
fi

status=$(jira_issue_status "$ticket" 2>/dev/null || true)
if [ "$status" = 'Done' ]; then
    say "${ticket} already Done — nothing to close out"
    exit 0
fi

# Only close a ticket that was already staged for testing. In Progress or To Do means someone is
# still working it, whatever merged; the worktree is cleaned up either way.
case "$status" in
    'Ready for Testing' | 'Testing') ;;
    *)
        say "${ticket} is '${status}' — worktree cleaned up, but leaving the ticket alone."
        say "Close it by hand if the merge really finished it."
        exit 0
        ;;
esac

say "${ticket} is '${status}' — closing it out"
jira_add_comment "$ticket" "The work for this ticket merged in ${pr_url} and the branch has been cleaned up.

Closing as complete." || { say "could not post the close-out comment"; exit 1; }
jira_transition_to "$ticket" Done || { say "comment posted but the Done transition failed"; exit 1; }
say "${ticket} commented and moved to Done"
