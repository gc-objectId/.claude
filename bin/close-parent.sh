#!/bin/sh
# Keeps a parent's board state honest as its subtasks close.
#
#   close-parent.sh <SUBTASK-OR-PARENT> [--commit]
#
# Closes the parent once every subtask is Done; comments on it in the two cases where it cannot
# be closed but a human would want to know: siblings still open, or all subtasks Done on a parent
# that was never staged for testing.
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
child=''
if [ -n "$parent" ]; then
    child="$ticket"
else
    parent="$ticket"
fi

# Posts once per distinct marker; a re-run of the same subtask must not add a second comment.
comment_once() {
    _marker="$1"
    _body="$2"
    if jira_comment_bodies "$parent" 2>/dev/null | grep -qF "$_marker"; then
        say "${parent} already carries that note"
        return 0
    fi
    if [ "$commit" != '--commit' ]; then
        say "(dry run — would comment on ${parent})"
        return 0
    fi
    jira_add_comment "$parent" "$_body" || { say "could not comment on ${parent}"; return 1; }
    say "${parent} commented"
}

status=$(jira_issue_status "$parent" 2>/dev/null || true)
[ "$status" != 'Done' ] || { say "${parent} is already Done"; exit 0; }

owner=$(jira_issue_field "$parent" assignee 'assignee.accountId' 2>/dev/null || true)
if [ -n "$owner" ] && [ "$owner" != "$JIRA_ACCOUNT_ID" ]; then
    say "${parent} belongs to someone else — leaving it alone"
    exit 8
fi

subs=$(jira_subtask_statuses "$parent" || true)
if [ -z "$subs" ]; then
    say "${parent} has no subtasks — nothing to infer from"
    exit 8
fi

total=$(printf '%s\n' "$subs" | grep -c . || true)
open_list=$(printf '%s\n' "$subs" | awk -F'\t' '$2 != "Done" { print "  " $1 " is " $2 }')

if [ -n "$open_list" ]; then
    say "${parent} still has open subtasks:"
    say "$open_list"
    if [ -n "$child" ]; then
        marker="Subtask ${child} has been validated and is Done."
        comment_once "$marker" "${marker}

Still open on this ticket:
${open_list}

This ticket stays open until every subtask is Done."
    fi
    exit 8
fi

# Closing on the children's state is the one place a parent moves from a status that is not staged
# for testing: every piece of its work is validated, so no column it sits in makes it incomplete.
say "${parent}: all ${total} subtasks are Done (parent is '${status}')"

if [ "$commit" != '--commit' ]; then
    say "(dry run — pass --commit to close it)"
    exit 0
fi

jira_add_comment "$parent" "All ${total} subtasks of this ticket are validated and Done, so the parent is closed as complete." ||
    { say "could not post the close-out comment"; exit 1; }
jira_transition_to "$parent" Done || { say "comment posted but the Done transition failed"; exit 1; }
say "${parent} commented and moved to Done"
