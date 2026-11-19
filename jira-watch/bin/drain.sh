#!/bin/sh
# Drains the coverage backlog that predates in-run coverage, one target file at a time.
#
#   drain.sh plan              what is left, grouped by the file the tests would land in
#   drain.sh LAMD              write everything headed for the local-anesthetic spec, as one PR
#   drain.sh OR-2804           write one ticket's proposals
#   drain.sh next              take the largest group
#
# Grouping is by destination, not by ticket, because that is where the cost is. Ten LAMD proposals
# from six tickets are one spec file, one fixture set, one review — six worktrees and six PRs for
# the same diff is the expensive way to do it.
#
# Each group gets: a worktree off origin/main, an ephemeral environment (qa-suite tests need a
# running app), a judging pass that applies the write_now rubric to proposals that predate it, then
# cover-run.sh. Nothing is written that the judging pass does not keep.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.claude/bin}"
RESULTS="${LOOP_HOME}/state/results"
ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"
DRAIN_MODEL="${DRAIN_MODEL:-claude-fable-5-1}"
JUDGE_TIMEOUT="${JUDGE_TIMEOUT:-900}"

say() { printf '%s\n' "$*" >&2; }

# "LAMD" from a proposal naming LAMD-002; otherwise the module or spec it names; otherwise the
# source ticket, which at least keeps one ticket's work together.
group_of() {
    _id="$1"; _body="$2"
    _fam=$(printf '%s' "$_body" | grep -oE '\b[A-Z]{2,8}-[0-9]{3}\b' | head -1 | cut -d- -f1)
    [ -z "$_fam" ] || { printf '%s' "$_fam"; return; }
    _cls=$(printf '%s' "$_body" | grep -oE '\b[A-Z][A-Za-z0-9]+Test\b' |
        grep -vxE 'SpringBootTest|DataJpaTest|WebMvcTest|BaseTest|ParameterizedTest|JsonTest|RestClientTest' | head -1)
    [ -z "$_cls" ] || { printf '%s' "$_cls"; return; }
    printf '%s' "${_id%#*}"
}

# One jq pass per run directory, cached for the process: the naive form re-read every session.json
# once per group and took minutes on a 250-proposal backlog.
CACHE=''
open_proposals() {
    [ -z "$CACHE" ] || { cat "$CACHE"; return; }
    CACHE=$(mktemp)
    _scan >"$CACHE"
    cat "$CACHE"
}

_scan() {
    for d in "$RESULTS"/*/; do
        t=$(basename "$d")
        [ -f "${d}session.json" ] || continue
        jq -r --arg t "$t" '(.automation.proposed_tests // []) | to_entries[]
            | "\($t)#\(.key)\t\(if (.value | type) == "object" then (.value.test // "") else .value end)"' \
            "${d}session.json" 2>/dev/null | tr -d '\r'
    done | awk -F'\t' -v st="${LOOP_HOME}/state/automation-status.tsv" '
        BEGIN { while ((getline l < st) > 0) { split(l, f, "\t"); if (f[2] != "open") done[f[1]] = 1 } }
        !($1 in done) { gsub(/\n/, " ", $2); print $1 "\t" $2 }' |
        while IFS="$(printf '\t')" read -r pid body; do
            printf '%s\t%s\t%s\n' "$pid" "$(group_of "$pid" "$body")" "$body"
        done
}

cmd_plan() {
    open_proposals | awk -F'\t' '
        { tk = $1; sub(/#.*/, "", tk)
          c[$2]++
          if (!(($2 SUBSEP tk) in seen)) { seen[$2 SUBSEP tk] = 1; t[$2] = t[$2] " " tk } }
        END { for (g in c) printf "%d\t%s\t%s\n", c[g], g, t[g] }' |
        sort -rn |
        awk -F'\t' '{ printf "%-12s %2s proposal(s)  %s\n", $2, $1, $3 }'
    printf '\ndrain one with: drain.sh <GROUP>\n'
}

cmd_drain() {
    group="$1"
    items=$(open_proposals | awk -F'\t' -v g="$group" '$2 == g')
    [ -n "$items" ] || { say "nothing open for group ${group}"; exit 4; }

    run_id="drain-$(printf '%s' "$group" | tr '[:upper:]' '[:lower:]')-$$"
    run_dir="${LOOP_HOME}/state/drains/${run_id}"
    mkdir -p "$run_dir"
    lead=$(printf '%s' "$items" | head -1 | cut -f1 | cut -d'#' -f1)

    # Judging reads the repo; it does not need the app. At an ~88% decline rate most groups die
    # here, so the image and the environment are bought only once something has survived.
    judge_tree="${run_dir}/judge-tree"
    git -C "$ORCI_ROOT" worktree add --detach "$judge_tree" origin/main >/dev/null 2>&1 ||
        { say "judging worktree failed for ${group}"; exit 1; }

    worktree=''
    image=''
    cleanup() {
        st=$?
        git -C "$ORCI_ROOT" worktree remove --force "$judge_tree" >/dev/null 2>&1 || true
        [ -z "$image" ] || "${CLAUDE_BIN}/env-down.sh" "$run_id" >/dev/null 2>&1 || true
        if [ -n "$worktree" ] && [ ! -s "${run_dir}/coverage-pr.txt" ]; then
            "${CLAUDE_BIN}/worktree-teardown.sh" "$worktree" >/dev/null 2>&1 || true
        fi
        exit "$st"
    }
    trap cleanup EXIT

    # These proposals predate the write_now judgement, so it is applied now, against the repo,
    # before anything is written. The rubric is the one in prompts/validate.md.
    printf '%s' "$items" | awk -F'\t' '{print "- " $1 ": " $3}' >"${run_dir}/raw.md"
    judge_prompt="Read ${LOOP_HOME}/prompts/validate.md, section 'Which proposed tests get written'. Apply that rubric to each proposal in ${run_dir}/raw.md, checking the actual repository at ${judge_tree} for each one — open the class or spec it names and see what is already there.

Write ${run_dir}/session.json as {\"automation\": {\"assessment\": \"...\", \"proposed_tests\": [{\"test\": \"...\", \"home\": \"...\", \"write_now\": true|false, \"why_not\": \"...\"}]}}, one entry per proposal in ${run_dir}/raw.md, in the same order. Judge only. Write no tests and change no files."

    ( cd "$judge_tree" && exec claude -p "$judge_prompt" \
        --model "$DRAIN_MODEL" --permission-mode bypassPermissions \
        --disallowed-tools 'mcp__claude_ai_Atlassian__*' \
        </dev/null >"${run_dir}/judge.log" 2>&1 ) &
    jpid=$!
    jwait=0
    while kill -0 "$jpid" 2>/dev/null; do
        jwait=$((jwait + 15))
        [ "$jwait" -lt "$JUDGE_TIMEOUT" ] || { kill -9 "$jpid" 2>/dev/null || true; say "judging timed out"; exit 5; }
        sleep 15
    done
    [ -s "${run_dir}/session.json" ] || { say "judging produced nothing"; exit 5; }

    kept=$(jq '[(.automation.proposed_tests // [])[] | select(.write_now == true)] | length' "${run_dir}/session.json")
    say "${group}: judged ${kept} of $(printf '%s' "$items" | wc -l | tr -d ' ') writable"

    # The status ids in the backlog follow raw.md's order, so a declined one is recorded there too.
    idx=0
    printf '%s' "$items" | cut -f1 | while IFS= read -r pid; do
        verdict=$(jq -r --argjson i "$idx" '(.automation.proposed_tests[$i] // {}) | if .write_now then "keep" else (.why_not // "declined on review") end' "${run_dir}/session.json")
        [ "$verdict" = 'keep' ] || "${LOOP_HOME}/bin/automation.sh" decline "$pid" "$verdict" >/dev/null 2>&1 || true
        idx=$((idx + 1))
    done

    [ "$kept" -gt 0 ] || { say "${group}: nothing survived judging"; exit 4; }

    worktree=$("${CLAUDE_BIN}/worktree-create.sh" "$lead" "coverage-$(printf '%s' "$group" | tr '[:upper:]' '[:lower:]')") ||
        { say "worktree creation failed for ${group}"; exit 1; }
    say "worktree=${worktree}"

    # Backend tests run under mvn in the worktree. Only a qa-suite home needs the app up.
    base_url=''
    if jq -e '[(.automation.proposed_tests // [])[] | select(.write_now == true)
               | .home // ""] | any(test("qa-suite"))' "${run_dir}/session.json" >/dev/null; then
        image=$("${CLAUDE_BIN}/build-image.sh") || { say "build failed"; exit 1; }
        env_json=$("${CLAUDE_BIN}/env-up.sh" "$run_id" "$image") || { say "env-up failed"; exit 1; }
        base_url=$(printf '%s' "$env_json" | jq -r '.base_url')
    else
        say "${group}: backend-only, skipping the image build and environment"
    fi

    "${LOOP_HOME}/bin/cover-run.sh" "$run_dir" "$worktree" "$lead" "$base_url"
}

case "${1:-plan}" in
    plan) cmd_plan ;;
    next) cmd_drain "$(open_proposals | cut -f2 | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')" ;;
    *)    cmd_drain "$1" ;;
esac
