#!/bin/sh
# Answers one question: does the build under test actually contain the ticket's merged fix?
#
#   freshness.sh <ticket> <built-ish>
#
# Prints a JSON object on stdout describing what was resolved; diagnostics go to stderr.
# Exit: 0 contained, 1 usage/error, 4 build is missing at least one merge commit,
#       5 no merged PR found for the ticket (nothing to validate against).
set -eu

ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"
# A ticket key can appear in an unrelated ancient PR; only recent merges are plausible sources.
PR_MAX_AGE_DAYS="${PR_MAX_AGE_DAYS:-120}"

say() { printf '%s\n' "$*" >&2; }
die() { say "Error: $*"; exit 1; }

[ $# -eq 2 ] || {
    say "Usage: freshness.sh <ticket> <built-ish>"
    exit 1
}

ticket="$1"
built="$2"

printf '%s' "$ticket" | grep -qE '^[A-Z][A-Z0-9]*-[0-9]+$' ||
    die "ticket '$ticket' is not a Jira key like OR-1234."

built_sha=$(git -C "$ORCI_ROOT" rev-parse --verify "$built^{commit}" 2>/dev/null) ||
    die "'$built' is not a resolvable commit in $ORCI_ROOT."

cutoff=$(date -u -v-"${PR_MAX_AGE_DAYS}"d '+%Y-%m-%dT%H:%M:%SZ')

# Title / "Fixes" references are deliberate; a bare mention anywhere in the body is not.
prs=$(gh pr list --repo "$(git -C "$ORCI_ROOT" remote get-url origin |
    sed -e 's#^git@github.com:##' -e 's#^https://github.com/##' -e 's#\.git$##')" \
    --search "$ticket" --state merged --limit 20 \
    --json number,title,body,mergeCommit,mergedAt 2>/dev/null) ||
    die "gh pr list failed for $ticket."

selected=$(printf '%s' "$prs" | jq -c --arg t "$ticket" --arg cutoff "$cutoff" '
    [ .[]
      | select(.mergedAt >= $cutoff)
      | select(.mergeCommit.oid != null)
      | . + {strong: ((.title | test($t)) or ((.body // "") | test("(?i)(fixes|closes|resolves)\\s+" + $t)))}
    ]
    | (map(select(.strong)) | if length > 0 then . else map(select(.strong | not)) end)
    | map({number, sha: .mergeCommit.oid, mergedAt, strong})')

count=$(printf '%s' "$selected" | jq 'length')
if [ "$count" -eq 0 ]; then
    say "No merged PR for $ticket within ${PR_MAX_AGE_DAYS}d — nothing to validate against."
    printf '%s\n' "$(jq -nc --arg t "$ticket" --arg b "$built_sha" \
        '{ticket: $t, built_sha: $b, merge_commits: [], contained: false, reason: "no_merged_pr"}')"
    exit 5
fi

say "Resolved $count merged PR(s) for $ticket:"
missing=0
for sha in $(printf '%s' "$selected" | jq -r '.[].sha'); do
    num=$(printf '%s' "$selected" | jq -r --arg s "$sha" '.[] | select(.sha == $s) | .number')
    if git -C "$ORCI_ROOT" merge-base --is-ancestor "$sha" "$built_sha" 2>/dev/null; then
        say "  ok      #${num} ${sha} is in the build"
    else
        say "  MISSING #${num} ${sha} is NOT in the build"
        missing=$((missing + 1))
    fi
done

if [ "$missing" -gt 0 ]; then
    say "Build ${built_sha} predates ${missing} of ${count} merge commit(s) — refusing."
    printf '%s\n' "$(jq -nc --arg t "$ticket" --arg b "$built_sha" --argjson prs "$selected" \
        '{ticket: $t, built_sha: $b, merge_commits: $prs, contained: false, reason: "stale_build"}')"
    exit 4
fi

printf '%s\n' "$(jq -nc --arg t "$ticket" --arg b "$built_sha" --argjson prs "$selected" \
    '{ticket: $t, built_sha: $b, merge_commits: $prs, contained: true, reason: "ok"}')"
