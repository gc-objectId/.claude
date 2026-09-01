#!/bin/sh
# Closes a parent once every one of its subtasks is Done.
#
#   close-parent.sh <SUBTASK-OR-PARENT> [--commit]
#
# Exit: 0 closed or nothing to do, 1 usage/error, 8 declined with a reason on stderr.
set -eu

CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.claude/bin}"
JIRA_ACCOUNT_ID="${JIRA_ACCOUNT_ID:-712020:eb570e67-6608-41f7-877b-09ca17738171}"

. "${CLAUDE_BIN}/jira.sh"

say() { printf '%s\n' "$*" >&2; }

ticket="${1:?usage: close-parent.sh <TICKET> [--commit]}"
commit="${2:-}"

parent=$(jira_issue_field "$ticket" parent 'parent.key' 2>/dev/null || true)
[ -n "$parent" ] || parent="$ticket"

status=$(jira_issue_status "$parent" 2>/dev/null || true)
case "$status" in
    Done) say "${parent} is already Done"; exit 0 ;;
    # Ryan's rule: never advance a ticket that is not already staged for testing.
    'Ready for Testing' | 'Testing') ;;
    *) say "${parent} is '${status}' — not closing it"; exit 8 ;;
esac

owner=$(jira_issue_field "$parent" assignee 'assignee.accountId' 2>/dev/null || true)
if [ -n "$owner" ] && [ "$owner" != "$JIRA_ACCOUNT_ID" ]; then
    say "${parent} belongs to someone else — not closing it"
    exit 8
fi

subs=$(jira_subtask_statuses "$parent" || true)
if [ -z "$subs" ]; then
    say "${parent} has no subtasks — nothing to infer from"
    exit 8
fi

total=$(printf '%s\n' "$subs" | grep -c . || true)
open_subs=$(printf '%s\n' "$subs" | awk -F'\t' '$2 != "Done" { print "  " $1 " is " $2 }')
if [ -n "$open_subs" ]; then
    say "${parent} still has open subtasks:"
    say "$open_subs"
    exit 8
fi

say "${parent}: all ${total} subtasks are Done"
if [ "$commit" != '--commit' ]; then
    say "(dry run — pass --commit to close it)"
    exit 0
fi

jira_add_comment "$parent" "All ${total} subtasks of this ticket are validated and Done, so the parent is closed as complete." ||
    { say "could not post the close-out comment"; exit 1; }
jira_transition_to "$parent" Done || { say "comment posted but the Done transition failed"; exit 1; }
say "${parent} commented and moved to Done"
