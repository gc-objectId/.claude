#!/bin/sh
# Establishes what --disallowed-tools can actually enforce.
#
# Per-tool denial already proved insufficient: denying getJiraIssue still let a session report
# OR-2743's status, because search/fetch/searchJiraIssuesUsingJql read issues too. Denying one
# tool does not deny the capability. So this tests whether denial works at server scope, which is
# what the validation session actually wants (it has no legitimate need for Jira access at all).
#
#   Expected if wildcards work:  control: Ready for Testing    wildcard: TOOL_UNAVAILABLE
#   Both statuses -> denial cannot fence off the connector; the gate's detection must be the
#                    boundary, not the flag.
#
# Note either result leaves bash+REST open: the session runs as Ryan with the keychain token
# reachable, so no tool-level flag is a true boundary. This only tells us how much the flag buys.
set -eu

Q='Use any Atlassian MCP tool to fetch the status of Jira issue OR-2743. Reply with only the status
name. If no such tool is available to you, reply exactly TOOL_UNAVAILABLE.'

printf 'control (nothing denied):   '
claude -p "$Q" || printf '(command failed)\n'

printf '\nwildcard (whole server):    '
claude -p "$Q" --disallowed-tools 'mcp__claude_ai_Atlassian__*' || printf '(command failed)\n'

printf '\nexplicit list (4 readers):  '
claude -p "$Q" --disallowed-tools \
    mcp__claude_ai_Atlassian__getJiraIssue \
    mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql \
    mcp__claude_ai_Atlassian__search \
    mcp__claude_ai_Atlassian__fetch || printf '(command failed)\n'
printf '\n'
