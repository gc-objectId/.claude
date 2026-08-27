#!/bin/sh
# Summarises validation runs, needs-a-human first.
#
#   digest.sh                    runs from the last 24h
#   digest.sh --since 2026-08-20 runs since a date
#   digest.sh --all              every run on record
#   digest.sh OR-2603            everything about one ticket: verdict, blockers, caveats, evidence
#
# The window is 24h rather than "today" on purpose: an overnight sweep is read in the morning, and
# a calendar-day default showed nothing at exactly the moment it was needed.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
RESULTS="${LOOP_HOME}/state/results"
SKIP_FILE="${LOOP_HOME}/state/skip"

[ -d "$RESULTS" ] || { printf 'No runs recorded yet.\n'; exit 0; }

# One ticket, in full — this is the view for acting on something the sweep handed back.
if printf '%s' "${1:-}" | grep -qE '^[A-Z][A-Z0-9]*-[0-9]+$'; then
    t="$1"
    d="${RESULTS}/${t}"
    [ -d "$d" ] || { printf 'No run on record for %s\n' "$t"; exit 0; }
    printf '=== %s ===\n\n' "$t"
    printf 'disposition : %s\n' "$(jq -r '.disposition' "$d/result.json" 2>/dev/null)"
    printf 'detail      : %s\n' "$(jq -r '.detail' "$d/result.json" 2>/dev/null)"
    printf 'ran at      : %s\n' "$(jq -r '.at' "$d/result.json" 2>/dev/null)"
    printf 'verdict     : %s\n' "$(jq -r '.verdict // "(none)"' "$d/session.json" 2>/dev/null)"
    printf 'built from  : %s\n' "$(jq -r '.sha // "?"' "$d/runner.json" 2>/dev/null)"
    for section in blockers caveats; do
        rows=$(jq -r --arg s "$section" '(.[$s] // [])[] | "  - " + .' "$d/session.json" 2>/dev/null || true)
        [ -n "$rows" ] && printf '\n%s:\n%s\n' "$section" "$rows"
    done
    for f in positive negative red_check; do
        v=$(jq -r --arg f "$f" '.evidence[$f] // ""' "$d/session.json" 2>/dev/null || true)
        [ -n "$v" ] && printf '\nevidence.%s:\n  %s\n' "$f" "$(printf '%s' "$v" | cut -c1-400)"
    done
    printf '\nfiles: %s\n' "$d"
    exit 0
fi

since=$(date -u -v-24H '+%Y-%m-%dT%H:%M:%SZ')
case "${1:-}" in
    --since) since="${2:?--since needs a date}" ;;
    --all)   since='0000' ;;
    '')      ;;
    *)       printf 'usage: digest.sh [--since DATE | --all | TICKET]\n' >&2; exit 1 ;;
esac

# Skip-listed tickets are handled; leaving them under NEEDS YOU means it never empties.
skipped=''
[ -f "$SKIP_FILE" ] && skipped=$(tr '\n' ' ' <"$SKIP_FILE")

records=$(find "$RESULTS" -name 'result.json' -maxdepth 2 2>/dev/null |
    while IFS= read -r f; do jq -c --arg s "$since" 'select(.at >= $s)' "$f" 2>/dev/null || true; done |
    jq -sc --arg skip "$skipped" '($skip | split(" ")) as $s
        | [.[] | select((.ticket | IN($s[])) | not)]')

total=$(printf '%s' "$records" | jq 'length')
if [ "$total" -eq 0 ]; then
    printf 'No validation runs since %s.\n' "$since"
    exit 0
fi

printf 'Validation digest — %s runs since %s\n\n' "$total" "$since"

section() {
    rows=$(printf '%s' "$records" | jq -r --arg d "$2" \
        '.[] | select(.disposition == $d) | "  \(.ticket)  \(.detail | split("\n")[0])"')
    [ -n "$rows" ] || return 0
    printf '%s (%s)\n%s\n\n' "$1" "$(printf '%s\n' "$rows" | grep -c . || true)" "$rows"
}

section 'NEEDS YOU — refused by the gate' refused
section 'NEEDS YOU — no merged PR, nothing to validate' no_merged_pr
section 'NEEDS YOU — aborted before validating' aborted
section 'NEEDS YOU — reserved for another reviewer' reserved
section 'Build did not contain the fix' stale_build
section 'Environment failed to come up' env_failed
section 'Session timed out' session_timeout
section 'Closed, with stated limits' admitted_with_caveats
section 'Closed clean' admitted

if [ -n "$(printf '%s' "$skipped" | tr -d ' ')" ]; then
    printf 'Skip-listed, not shown above: %s\n' "$skipped"
fi
printf 'Detail on any one: digest.sh <TICKET>\n'
