#!/bin/sh
# The coverage backlog. Every validation proposes tests; this is what stops them evaporating.
#
#   automation.sh                    open proposals, grouped by the ticket that produced them
#   automation.sh --all              include done and declined
#   automation.sh done OR-2723#2     mark one written
#   automation.sh decline OR-2723#2 "why"
#   automation.sh ticket OR-2723     draft a Jira ticket bundling that ticket's open proposals
#   automation.sh ticket OR-2723 --create   create it for real, linked to the source
#
# Proposals live in each run's session.json, so they are never lost. What was missing was anywhere
# to see them all and mark them off, which meant closed tickets quietly took their coverage with
# them.
set -eu

LOOP_HOME="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.claude/bin}"
RESULTS="${LOOP_HOME}/state/results"
STATUS_FILE="${LOOP_HOME}/state/automation-status.tsv"
# Curation reword and additions, so later views show the agreed text rather than the original.
AMEND_FILE="${LOOP_HOME}/state/automation-amend.tsv"
ADDED_FILE="${LOOP_HOME}/state/automation-added.tsv"

. "${CLAUDE_BIN}/jira.sh"
touch "$STATUS_FILE" "$AMEND_FILE" "$ADDED_FILE"

# Amended text wins over whatever the session originally proposed.
text_of() {
    _amended=$(grep -m1 "^$1	" "$AMEND_FILE" 2>/dev/null | cut -f2- || true)
    if [ -n "$_amended" ]; then printf '%s' "$_amended"; else printf '%s' "$2"; fi
}

status_of() {
    awk -F'\t' -v id="$1" '$1 == id { print $2; found=1 } END { if (!found) print "open" }' "$STATUS_FILE" | head -1
}

set_status() {
    grep -v "^$1	" "$STATUS_FILE" >"${STATUS_FILE}.tmp" 2>/dev/null || true
    printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "${3:-}" >>"${STATUS_FILE}.tmp"
    mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
}

# TICKET#N, N being the index within that run.
each_proposal() {
    for d in "$RESULTS"/*/; do
        t=$(basename "$d")
        [ -f "${d}session.json" ] || continue
        n=$(jq '(.automation.proposed_tests // []) | length' "${d}session.json" 2>/dev/null || echo 0)
        i=0
        while [ "$i" -lt "$n" ]; do
            body=$(jq -r --argjson i "$i" '.automation.proposed_tests[$i]' "${d}session.json")
            printf '%s#%s\t%s\n' "$t" "$i" "$(text_of "${t}#${i}" "$body")"
            i=$((i + 1))
        done
    done
    # Items added during curation, which no session proposed.
    cat "$ADDED_FILE" 2>/dev/null || true
}

cmd_list() {
    show_all="${1:-}"
    current=''
    open_n=0
    done_n=0
    decl_n=0
    each_proposal | while IFS="$(printf '\t')" read -r id body; do
        st=$(status_of "$id")
        [ "$show_all" = '--all' ] || [ "$st" = 'open' ] || continue
        tk=${id%#*}
        if [ "$tk" != "$current" ]; then
            current="$tk"
            printf '\n%s  (%s)\n' "$tk" "$(jq -r '.disposition' "${RESULTS}/${tk}/result.json" 2>/dev/null || echo '?')"
        fi
        case "$st" in
            done)     printf '  [done]     %-12s %s\n' "$id" "$(printf '%s' "$body" | cut -c1-92)" ;;
            declined) printf '  [declined] %-12s %s\n' "$id" "$(printf '%s' "$body" | cut -c1-92)" ;;
            *)        printf '  %-12s %s\n' "$id" "$(printf '%s' "$body" | cut -c1-100)" ;;
        esac
    done

    total=$(each_proposal | wc -l | tr -d ' ')
    open_count=$(each_proposal | while IFS="$(printf '\t')" read -r id _; do status_of "$id"; done | grep -c '^open$' || true)
    printf '\n%s open of %s proposed.\n' "$open_count" "$total"
    printf 'mark: automation.sh done <ID>   |   drop: automation.sh decline <ID> "why"\n'
    printf 'bundle into a ticket: automation.sh ticket <SOURCE-TICKET>\n'
}

cmd_ticket() {
    src="$1"
    create="${2:-}"
    [ -f "${RESULTS}/${src}/session.json" ] || { printf 'no run on record for %s\n' "$src"; exit 1; }

    open_items=$(each_proposal | grep "^${src}#" | while IFS="$(printf '\t')" read -r id body; do
        [ "$(status_of "$id")" = 'open' ] && printf -- '- %s\n' "$body"
    done)
    [ -n "$open_items" ] || { printf '%s has no open proposals.\n' "$src"; exit 0; }

    summary="Automation: coverage from ${src} validation"
    assessment=$(jq -r '.automation.assessment // ""' "${RESULTS}/${src}/session.json")
    body="Automated validation of ${src} identified coverage worth locking in.

Existing coverage, as assessed during that validation:

${assessment}

Proposed tests:

${open_items}

Source validation evidence: ${RESULTS}/${src}/session.json"

    if [ "$create" != '--create' ]; then
        printf '─── DRAFT (nothing created) ───\n\n'
        printf 'Project : OR\nType    : Task\nSummary : %s\n\n%s\n\n' "$summary" "$body"
        printf '─── create it with: automation.sh ticket %s --create ───\n' "$src"
        exit 0
    fi

    key=$(jira_create_issue OR Task "$summary" "$body")
    [ -n "$key" ] || { printf 'creation failed\n'; exit 1; }
    printf 'created %s\n' "$key"
    jira_link_issues "$key" "$src" && printf 'linked %s -> %s\n' "$key" "$src" || printf 'created but not linked\n'
    each_proposal | grep "^${src}#" | while IFS="$(printf '\t')" read -r id _; do
        [ "$(status_of "$id")" = 'open' ] && set_status "$id" done "ticketed as ${key}"
    done
    printf 'proposals from %s marked done (tracked on %s)\n' "$src" "$key"
}

# Untruncated, unlike the list view: tests get written from this.
cmd_open() {
    each_proposal | grep "^${1}#" | while IFS="$(printf '\t')" read -r id body; do
        [ "$(status_of "$id")" = 'open' ] && printf '%s\n  %s\n\n' "$id" "$body"
    done
}

next_added_id() {
    _n=$(grep -c "^${1}#a" "$ADDED_FILE" 2>/dev/null || true)
    [ -n "$_n" ] || _n=0
    printf '%s#a%s' "$1" "$((_n + 1))"
}

PR_FILES_CACHE="${LOOP_HOME}/state/pr-files"

# Which tickets' coverage would land in the same place. Three signals, strongest first: the same
# merged PR, a shared Jira parent, or overlapping changed files.
cmd_groups() {
    mkdir -p "$PR_FILES_CACHE"
    repo=$(git -C "${ORCI_ROOT:-$HOME/dev/orci}" remote get-url origin |
        sed -e 's#^git@github.com:##' -e 's#^https://github.com/##' -e 's#\.git$##')

    tickets=$(each_proposal | while IFS="$(printf '\t')" read -r id _; do
        [ "$(status_of "$id")" = 'open' ] && printf '%s\n' "${id%#*}"
    done | sort -u)
    [ -n "$tickets" ] || { printf 'Nothing in the backlog.\n'; return 0; }

    facts="${LOOP_HOME}/state/.group-facts"
    : >"$facts"
    for t in $tickets; do
        pr=$(jq -r '.freshness.merge_commits[0].number // empty' "${RESULTS}/${t}/runner.json" 2>/dev/null || true)
        parent=$(jira_issue_field "$t" parent 'parent.key' 2>/dev/null || true)
        files=''
        if [ -n "$pr" ]; then
            cache="${PR_FILES_CACHE}/${pr}.txt"
            [ -s "$cache" ] || gh pr diff "$pr" --repo "$repo" --name-only >"$cache" 2>/dev/null || true
            # Test paths only: the question is where the new coverage lands, and a shared main-code
            # file chains half the repo into one group.
            files=$(grep -E '(src/test/|qa-suite/)' "$cache" 2>/dev/null | tr '\n' ' ' || true)
        fi
        printf '%s\t%s\t%s\t%s\n' "$t" "${pr:--}" "${parent:--}" "$files" >>"$facts"
    done

    python3 - "$facts" <<'PYEOF'
import sys, collections
rows = [l.rstrip("\n").split("\t") for l in open(sys.argv[1]) if l.strip()]
parent = {t: p for t, _, p, _ in rows}
pr = {t: n for t, n, _, _ in rows}
files = {t: set(f.split()) for t, _, _, f in rows}

counts = collections.Counter(f for s in files.values() for f in s)
common = {f for f, c in counts.items() if c > max(2, len(rows) // 3)}

def related(a, b):
    if pr[a] != "-" and pr[a] == pr[b]:
        return "same PR #" + pr[a]
    if parent[a] != "-" and parent[a] == parent[b]:
        return "same parent " + parent[a]
    shared = (files[a] & files[b]) - common
    if len(shared) >= 2:
        return "%d shared test files, e.g. %s" % (len(shared), sorted(shared)[0])
    return None

tickets = [r[0] for r in rows]
seen, groups = set(), []
for t in tickets:
    if t in seen:
        continue
    grp, why, queue = [t], [], [t]
    seen.add(t)
    while queue:
        cur = queue.pop()
        for o in tickets:
            if o in seen:
                continue
            r = related(cur, o)
            if r:
                seen.add(o)
                grp.append(o)
                queue.append(o)
                why.append(r)
    if len(grp) > 1:
        groups.append((sorted(grp), why[0]))

if not groups:
    print("No grouping candidates - every ticket stands alone.")
else:
    print("Coverage that belongs together:")
    print("")
    for g, why in groups:
        print("  loopcmd cover " + " ".join(g))
        print("      " + why)
        print("")
PYEOF
    rm -f "$facts"
}

# Oldest source ticket still carrying open proposals.
cmd_next() {
    each_proposal | while IFS="$(printf '\t')" read -r id _; do
        [ "$(status_of "$id")" = 'open' ] && printf '%s\n' "${id%#*}"
    done | head -1
}

case "${1:-}" in
    ''|--all)  cmd_list "${1:-}" ;;
    next)      cmd_next ;;
    groups)    cmd_groups ;;
    amend)
        printf '%s\t%s\n' "${2:?need an ID}" "${3:?need the new text}" >>"$AMEND_FILE"
        printf 'amended %s\n' "$2"
        ;;
    add)
        _id=$(next_added_id "${2:?need a ticket}")
        printf '%s\t%s\n' "$_id" "${3:?need the text}" >>"$ADDED_FILE"
        printf 'added %s\n' "$_id"
        ;;
    open)      cmd_open "${2:?need a ticket}" ;;
    done)      set_status "${2:?need an ID}" done "${3:-}"; printf 'marked %s done\n' "$2" ;;
    decline)   set_status "${2:?need an ID}" declined "${3:-}"; printf 'declined %s\n' "$2" ;;
    ticket)    cmd_ticket "${2:?need a source ticket}" "${3:-}" ;;
    *)         printf 'usage: automation.sh [--all | next | groups | open TICKET | amend ID "text" | add TICKET "text" | done ID | decline ID "why" | ticket TICKET [--create]]\n' >&2; exit 1 ;;
esac
