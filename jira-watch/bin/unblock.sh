#!/bin/sh
# Walks the tickets the sweep handed back, one at a time, and turns each into a decision.
#
#   unblock.sh            every ticket needing a human
#   unblock.sh OR-2603    just one
#
# Answers are posted as a Jira comment, which is the same channel the next session reads through
# context.md — so replying here is what lets the next sweep pick the ticket up knowing more than
# the last one did. Posting a comment also makes backlog.sh offer the ticket again on its own.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.claude/bin}"
RESULTS="${LOOP_HOME}/state/results"
SKIP_FILE="${LOOP_HOME}/state/skip"
EDITOR_CMD="${EDITOR:-nano}"

. "${CLAUDE_BIN}/jira.sh"

mkdir -p "$(dirname "$SKIP_FILE")"
touch "$SKIP_FILE"

# Warn rather than refuse: acting on a ticket the sweep is not touching is safe.
if pgrep -f 'jira-watch/bin/runner.sh' >/dev/null 2>&1; then
    printf 'NOTE: a sweep is running right now. Tickets it is still working are not listed here\n'
    printf '      (only finished outcomes are), but its results will change under you.\n\n'
fi

needs_human() {
    case "$1" in
        refused | no_merged_pr | aborted | env_failed | session_timeout | stale_build) return 0 ;;
        *) return 1 ;;
    esac
}

handle() {
    ticket="$1"
    d="${RESULTS}/${ticket}"
    disp=$(jq -r '.disposition' "$d/result.json" 2>/dev/null || echo '?')
    detail=$(jq -r '.detail' "$d/result.json" 2>/dev/null || echo '')
    status=$(jira_issue_status "$ticket" 2>/dev/null || echo '?')
    summary=$(jira_issue_summary "$ticket" 2>/dev/null || echo '')

    printf '\n────────────────────────────────────────────────────────\n'
    printf '%s  [%s]  %s\n' "$ticket" "$status" "$(printf '%s' "$summary" | cut -c1-52)"
    printf 'outcome: %s — %s\n' "$disp" "$(printf '%s' "$detail" | head -1)"

    blockers=$(jq -r '(.blockers // [])[]' "$d/session.json" 2>/dev/null || true)
    if [ -n "$blockers" ]; then
        printf '\nopen questions:\n'
        printf '%s\n' "$blockers" | sed 's/^/  • /'
    else
        printf '\n(no blockers recorded — the run failed before it could ask anything)\n'
    fi

    printf '\n  a) answer the questions (posts a comment, re-queues the ticket)\n'
    printf '  r) retry as-is on the next sweep\n'
    printf '  s) skip permanently — not locally validatable\n'
    printf '  p) send back to In Progress (not actually implemented)\n'
    printf '  n) leave it, next ticket\n'
    printf '  q) quit\n'
    printf 'choice: '
    read -r choice </dev/tty

    case "$choice" in
        a)
            tmp=$(mktemp)
            {
                printf 'Answers to the automated validation'"'"'s open questions.\n'
                printf 'Type your answer under each. Lines starting with # are ignored.\n\n'
                if [ -n "$blockers" ]; then
                    printf '%s\n' "$blockers" | while IFS= read -r b; do
                        printf 'Q: %s\nA: \n\n' "$b"
                    done
                else
                    printf 'Notes:\n\n'
                fi
            } >"$tmp"
            "$EDITOR_CMD" "$tmp" </dev/tty >/dev/tty 2>&1 || true
            body=$(grep -v '^#' "$tmp" | sed '/^[[:space:]]*$/d')
            rm -f "$tmp"
            if [ -z "$body" ]; then
                printf 'nothing written — leaving %s alone\n' "$ticket"
                return 0
            fi
            if jira_add_comment "$ticket" "$body"; then
                printf 'posted. %s will be offered again on the next sweep.\n' "$ticket"
            else
                printf 'FAILED to post the comment for %s\n' "$ticket"
            fi
            ;;
        r)
            # Clearing the record is what makes backlog.sh treat it as never-run.
            rm -f "$d/result.json"
            printf 'cleared %s — it will be picked up again as if new.\n' "$ticket"
            ;;
        s)
            grep -qxF "$ticket" "$SKIP_FILE" || printf '%s\n' "$ticket" >>"$SKIP_FILE"
            printf 'added %s to the skip list (%s).\n' "$ticket" "$SKIP_FILE"
            ;;
        p)
            if jira_transition_to "$ticket" 'In Progress'; then
                printf 'moved %s to In Progress — out of the sweep until it comes back.\n' "$ticket"
            else
                printf 'could not transition %s\n' "$ticket"
            fi
            ;;
        q) return 1 ;;
        *) printf 'left %s alone.\n' "$ticket" ;;
    esac
    return 0
}

# Non-interactive forms so a session takes the same actions as the prompts.
case "${1:-}" in
    answer)
        t="${2:?need a ticket}"; text="${3:?need the answer text}"
        jira_add_comment "$t" "$text" && printf 'posted on %s; it will be offered again.\n' "$t"
        exit $?
        ;;
    retry)
        t="${2:?need a ticket}"
        rm -f "${RESULTS}/${t}/result.json"
        printf 'cleared %s — it reads as never-run.\n' "$t"
        exit 0
        ;;
    skip)
        t="${2:?need a ticket}"
        grep -qxF "$t" "$SKIP_FILE" || printf '%s\n' "$t" >>"$SKIP_FILE"
        printf 'added %s to the skip list.\n' "$t"
        exit 0
        ;;
    inprogress)
        t="${2:?need a ticket}"
        jira_transition_to "$t" 'In Progress' && printf 'moved %s to In Progress.\n' "$t"
        exit $?
        ;;
esac

if [ $# -gt 0 ]; then
    handle "$1" || true
    exit 0
fi

found=0
for dir in "$RESULTS"/*/; do
    t=$(basename "$dir")
    [ -f "${dir}result.json" ] || continue
    disp=$(jq -r '.disposition' "${dir}result.json" 2>/dev/null || echo '?')
    needs_human "$disp" || continue
    # Already dealt with; re-offering it every review is how the queue stops being trusted.
    if grep -qxF "$t" "$SKIP_FILE" 2>/dev/null; then
        printf 'skipping %s (on the skip list)\n' "$t"
        continue
    fi
    found=$((found + 1))
    handle "$t" || break
done

printf '\n'
if [ "$found" -eq 0 ]; then
    printf 'Nothing needs you.\n'
else
    printf 'Done. %s ticket(s) reviewed.\n' "$found"
    printf 'Next sweep: nohup caffeinate -ims sh -c '"'"'for t in $(%s/backlog.sh --limit 8); do %s/runner.sh "$t" --commit; done'"'"' > %s/log/sweep.log 2>&1 &\n' \
        "${LOOP_HOME}/bin" "${LOOP_HOME}/bin" "$LOOP_HOME"
fi
