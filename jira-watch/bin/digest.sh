#!/bin/sh
# Summarises the day's validation runs: what closed, what was refused, and what needs a human.
#
#   digest.sh [--since YYYY-MM-DD]
#
# Exit: 0 always (a digest with nothing in it is a valid answer).
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
RESULTS="${LOOP_HOME}/state/results"
since="${2:-$(date -u '+%Y-%m-%d')}"

[ -d "$RESULTS" ] || { printf 'No runs recorded yet.\n'; exit 0; }

records=$(find "$RESULTS" -name 'result.json' -maxdepth 2 2>/dev/null |
    while IFS= read -r f; do
        jq -c --arg since "$since" 'select(.at >= $since)' "$f" 2>/dev/null || true
    done | jq -sc '.')

total=$(printf '%s' "$records" | jq 'length')
if [ "$total" -eq 0 ]; then
    printf 'No validation runs since %s.\n' "$since"
    exit 0
fi

printf 'Validation digest — %s runs since %s\n\n' "$total" "$since"

section() {
    heading="$1"
    filter="$2"
    rows=$(printf '%s' "$records" | jq -r --arg d "$filter" \
        '.[] | select(.disposition == $d) | "  \(.ticket)  \(.detail)"')
    [ -n "$rows" ] || return 0
    count=$(printf '%s\n' "$rows" | grep -c . || true)
    printf '%s (%s)\n%s\n\n' "$heading" "$count" "$rows"
}

# Needs-a-human dispositions come first: they are the only ones that will not resolve themselves.
section 'NEEDS A HUMAN — reserved for another reviewer, validated but not posted' reserved
section 'NEEDS A HUMAN — no merged PR, nothing to validate' no_merged_pr
section 'NEEDS A HUMAN — refused by the gate' refused
section 'NEEDS A HUMAN — aborted before validating' aborted
section 'Build did not contain the fix' stale_build
section 'Environment failed to come up' env_failed
section 'Session timed out' session_timeout
section 'Admitted' admitted

printf 'Full records: %s/<TICKET>/result.json\n' "$RESULTS"
