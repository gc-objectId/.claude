#!/bin/sh
# Writes the coverage a validation asked for, in a worktree, and leaves a draft PR behind.
#
#   cover-run.sh <run-dir> <worktree> <ticket> [base-url]
#
# COVER_BASE is the branch the draft PR targets. It is `main` for VALIDATE, where the fix merged
# before validation started; REVIEW sets it to the PR's own head branch so the coverage stacks on
# the author's work instead of racing it to main.
#
# Called twice over: by runner.sh while the validation's environment is still up, and by drain.sh
# for tickets whose proposals predate that. Both want the same thing — proposals in, a gated draft
# PR out — so the difference is only who sets the worktree up.
#
# Exit: 0 wrote and pushed, 4 nothing to write, 5 session produced nothing, 8 gate refused,
#       9 wrote but could not push, 10 a written test passed without the fix.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.claude/bin}"
COVER_MODEL="${COVER_MODEL:-claude-fable-5-1}"
COVER_TIMEOUT="${COVER_TIMEOUT:-2400}"
COVER_BASE="${COVER_BASE:-main}"
ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"

run_dir="${1:?need a run dir}"
worktree="${2:?need a worktree}"
ticket="${3:?need a ticket}"
base_url="${4:-}"

session_json="${run_dir}/session.json"
coverage_json="${run_dir}/coverage.json"
proposals="${run_dir}/proposals.md"
log_file="${run_dir}/cover.log"

say() { printf '%s\n' "$*" >&2; }

# Only the ones the validating session judged runnable. Older runs proposed bare strings, which
# predate the judgement and are drained by hand rather than written unattended.
writable=$(jq -c '[(.automation.proposed_tests // [])[]
                   | select(type == "object") | select(.write_now == true)]' \
    "$session_json" 2>/dev/null || echo '[]')
n=$(printf '%s' "$writable" | jq 'length')
[ "$n" -gt 0 ] || { say "no write_now proposals for ${ticket}"; exit 4; }

# Claim each target file before the session starts. Two tickets validated in one sweep both proposed
# a test into InternalNotificationServiceTest.java; the branches were cut from the same main and
# inserted at the same anchor, so the second PR to merge needed a rebase and nothing had seen it
# coming. A proposal whose file is held is deferred with the holder named, not written blind.
kept='[]'
i=0
while [ "$i" -lt "$n" ]; do
    item=$(printf '%s' "$writable" | jq -c --argjson i "$i" '.[$i]')
    home=$(printf '%s' "$item" | jq -r '.home // ""')
    if [ -n "$home" ] && ! held=$("${CLAUDE_BIN}/test-file-claim.sh" take "$ticket" "$home" 2>/dev/null); then
        say "${ticket}#${i}: ${home} is claimed by ${held} — deferring this proposal"
        # Left open in the backlog on purpose: it is writable, just not yet. Declining it here would
        # hide work that only needs the holding PR to merge first.
        printf '%s#%s\t%s\tclaimed by %s\n' "$ticket" "$i" "$home" "$held" >>"${run_dir}/deferred.tsv"
    else
        kept=$(printf '%s' "$kept" | jq -c --argjson it "$item" '. + [$it]')
    fi
    i=$((i + 1))
done
writable="$kept"
n=$(printf '%s' "$writable" | jq 'length')
[ "$n" -gt 0 ] || { say "${ticket}: every proposal's file is claimed elsewhere"; exit 4; }

release_claims() { "${CLAUDE_BIN}/test-file-claim.sh" release "$ticket" >/dev/null 2>&1 || true; }

# Reserved before the session starts, so two runs cannot both be handed LAMD-002.
{
    printf '# Proposed tests for %s\n\nWrite exactly these.\n\n' "$ticket"
    i=0
    while [ "$i" -lt "$n" ]; do
        item=$(printf '%s' "$writable" | jq -c --argjson i "$i" '.[$i]')
        home=$(printf '%s' "$item" | jq -r '.home // ""')
        body=$(printf '%s' "$item" | jq -r '.test // ""')
        printf -- '## %s#%s\n\n- **file**: `%s`\n- **assert**: %s\n' "$ticket" "$i" "$home" "$body"
        case "$home" in
            *qa-suite/*.spec.ts)
                prefix=$(printf '%s' "$body" | grep -oE '\b[A-Z]{2,8}-[0-9]{3}\b' | head -1 | cut -d- -f1)
                if [ -n "$prefix" ]; then
                    allocated=$(TEST_ID_OWNER="$ticket" "${CLAUDE_BIN}/test-id.sh" next "$prefix" 1)
                    printf -- '- **id**: `%s` (reserved for you — use this one, not the one in the line above)\n' "$allocated"
                fi
                ;;
        esac
        printf '\n'
        i=$((i + 1))
    done
} >"$proposals"
say "${ticket}: ${n} proposal(s) -> ${proposals}"

prompt=$(sed \
    -e "s|__TICKET__|${ticket}|g" \
    -e "s|__BASE_URL__|${base_url}|g" \
    -e "s|__PROPOSALS_FILE__|${proposals}|g" \
    -e "s|__COVERAGE_JSON__|${coverage_json}|g" \
    "${LOOP_HOME}/prompts/cover.md")

rm -f "$coverage_json"
( cd "$worktree" && exec claude -p "$prompt" \
    --model "$COVER_MODEL" \
    --permission-mode bypassPermissions \
    --disallowed-tools \
        'mcp__claude_ai_Atlassian__*' \
    </dev/null >"$log_file" 2>&1 ) &
pid=$!

waited=0
while kill -0 "$pid" 2>/dev/null; do
    waited=$((waited + 15))
    [ $((waited % 300)) -eq 0 ] && say "  … ${ticket} coverage still running (${waited}s)"
    if [ "$waited" -ge "$COVER_TIMEOUT" ]; then
        kill -9 "$pid" 2>/dev/null || true
        say "${ticket}: coverage session exceeded ${COVER_TIMEOUT}s"
        exit 5
    fi
    sleep 15
done

[ -s "$coverage_json" ] || { release_claims; say "${ticket}: coverage session wrote nothing"; exit 5; }
written=$(jq '(.written // []) | length' "$coverage_json")
[ "$written" -gt 0 ] || {
    release_claims
    say "${ticket}: session wrote nothing — $(jq -r '[(.skipped // [])[].why] | join("; ")' "$coverage_json")"
    exit 4
}

# Test paths only, nothing disabled, no assertions removed. Stricter than the validation gate
# because for test-writing every property that matters is mechanically checkable.
"${CLAUDE_BIN}/automate-gate.sh" "$worktree" >/dev/null || {
    release_claims
    say "${ticket}: automate-gate refused the branch"
    exit 8
}

# The session reported watching each absence assertion go red. This replays the new Java tests
# against the commit before the fix and refuses if any of them passes there, which is the same claim
# checked rather than taken. A test that passes without the fix tests nothing.
fix=$(git -C "$ORCI_ROOT" log "origin/${COVER_BASE}" --grep="$ticket" --format=%H -1 2>/dev/null || true)
if [ -n "$fix" ]; then
    if "${CLAUDE_BIN}/canfail.sh" "$worktree" "$fix" >"${run_dir}/canfail.json" 2>>"$log_file"; then
        say "${ticket}: canfail — every replayed test went red at ${fix}^"
    else
        rc=$?
        if [ "$rc" -eq 8 ]; then
            release_claims
            say "${ticket}: canfail refused — a written test passes without the fix"
            jq -r 'select(.verdict == "green") | "  green: " + .test + " — " + .detail' \
                "${run_dir}/canfail.json" 2>/dev/null >&2 || true
            "${CLAUDE_BIN}/notify.sh" "$(printf '%s: coverage held back — a test passes without the fix. Worktree kept at %s' \
                "$ticket" "$worktree")" >/dev/null 2>&1 || true
            exit 10
        fi
        say "${ticket}: canfail could not run (rc=${rc}) — continuing, see ${log_file}"
    fi
else
    say "${ticket}: no commit on origin/${COVER_BASE} mentions ${ticket} — skipping canfail"
fi

branch=$(git -C "$worktree" branch --show-current)
git -C "$worktree" push -u origin "$branch" >>"$log_file" 2>&1 || { say "${ticket}: push failed"; exit 9; }

summary=$(jq -r '[(.written // [])[] | "- " + .test + " (" + .file + ")"] | join("\n")' "$coverage_json")
reds=$(jq -r '[(.written // [])[] | select((.red_proof // "") != "") | "- " + .test + ": " + .red_proof] | join("\n")' "$coverage_json")
body="Coverage proposed by the automated validation of ${ticket} and written in the same run, against the build that validation exercised.

${summary}"
[ -z "$reds" ] || body="${body}

Absence assertions, each seen red:

${reds}"
if [ -s "${run_dir}/canfail.json" ]; then
    replay=$(jq -r 'select(.test) | "- " + .test + ": " + .verdict + " — " + .detail' \
        "${run_dir}/canfail.json" 2>/dev/null || true)
    [ -z "$replay" ] || body="${body}

Replayed against the commit before the fix:

${replay}"
fi

pr=$(cd "$worktree" && gh pr create --draft --base "$COVER_BASE" --head "$branch" \
    --title "${ticket}: coverage from validation" --body "$body" 2>>"$log_file") || {
    say "${ticket}: branch pushed but PR creation failed"
    exit 9
}
say "${ticket}: ${pr}"
printf '%s' "$pr" >"${run_dir}/coverage-pr.txt"

# Marked done here rather than at merge: the proposal has become a reviewable diff, which is the
# transition that was never happening.
i=0
while [ "$i" -lt "$n" ]; do
    "${LOOP_HOME}/bin/automation.sh" done "${ticket}#${i}" "written in-run, ${pr}" >/dev/null 2>&1 || true
    i=$((i + 1))
done
exit 0
