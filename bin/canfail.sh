#!/bin/sh
# Verifies that new tests actually fail without the fix they claim to cover.
#
#   canfail.sh <worktree> <fix-commit> [test-path ...]
#
# A test that passes against the pre-fix code tests nothing. This is the red check applied to
# generated coverage: green on the branch is assumed (the writer ran it); the question asked here is
# whether it can go red. Paths default to the test files the branch adds or changes.
#
# Java tests are replayed against the fix's parent commit. Playwright specs need the running
# ephemeral app with the pre-fix class swapped in, so they are reported, not run, unless --app-url
# is given.
#
# Emits one JSON object per test file on stdout, then a summary object.
# Exit: 0 every test went red, 1 usage/error, 8 at least one test passed without the fix.
set -eu

ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"
APP_URL=''

say() { printf '%s\n' "$*" >&2; }
die() { say "Error: $*"; exit 1; }

wt="${1:?usage: canfail.sh <worktree> <fix-commit> [test-path ...]}"
fix="${2:?usage: canfail.sh <worktree> <fix-commit> [test-path ...]}"
shift 2

paths=''
while [ $# -gt 0 ]; do
    case "$1" in
        --app-url) APP_URL="${2:?--app-url needs a value}"; shift 2 ;;
        *) paths="${paths}${1}
"; shift ;;
    esac
done

[ -d "$wt" ] || die "not a directory: $wt"
baseline=$(git -C "$ORCI_ROOT" rev-parse --verify "${fix}^" 2>/dev/null) ||
    die "cannot resolve ${fix}^ — is ${fix} a commit in ${ORCI_ROOT}?"

# Default to whatever test files this branch introduced.
if [ -z "$paths" ]; then
    base=$(git -C "$wt" merge-base HEAD origin/main 2>/dev/null) || die "no merge-base with origin/main"
    paths=$(git -C "$wt" diff --name-only "$base" HEAD 2>/dev/null |
        grep -E '(src/test/java/.*\.java|qa-suite/.*\.spec\.ts)$' || true)
fi
paths=$(printf '%s\n' "$paths" | grep -E '.' || true)
[ -n "$paths" ] || die "no test files to check"

scratch=''
cleanup() {
    [ -n "$scratch" ] && git -C "$ORCI_ROOT" worktree remove --force "$scratch" >/dev/null 2>&1
    return 0
}
trap cleanup EXIT

reds=0; greens=0; skipped=0

# The pre-fix tree, built once and reused for every Java test.
java_baseline_tree() {
    [ -n "$scratch" ] && return 0
    scratch=$(mktemp -d -t canfail) || die "cannot make a scratch directory"
    rmdir "$scratch"
    git -C "$ORCI_ROOT" worktree add --detach "$scratch" "$baseline" >/dev/null 2>&1 ||
        die "could not create a worktree at ${baseline}"
    say "baseline worktree at ${baseline} (${scratch})"
}

emit() {
    jq -nc --arg f "$1" --arg k "$2" --arg v "$3" --arg d "$4" \
        '{test: $f, kind: $k, verdict: $v, detail: $d}'
}

for f in $paths; do
    case "$f" in
        */src/test/java/*.java)
            java_baseline_tree
            cls=$(basename "$f" .java)
            mkdir -p "${scratch}/$(dirname "$f")"
            cp "${wt}/${f}" "${scratch}/${f}" 2>/dev/null || {
                emit "$f" java error "not present in the worktree"; skipped=$((skipped + 1)); continue
            }
            out=$( (cd "$scratch" && mvn -B -q test -Dtest="$cls" \
                -Dsurefire.failIfNoSpecifiedTests=false 2>&1) ) && rc=0 || rc=$?
            if [ "$rc" -eq 0 ]; then
                emit "$f" java green "passed at ${baseline} — it does not exercise the fix"
                greens=$((greens + 1))
            elif printf '%s' "$out" | grep -q 'COMPILATION ERROR'; then
                emit "$f" java red-compile "did not compile at ${baseline}; the fix added API it needs"
                reds=$((reds + 1))
            else
                emit "$f" java red "failed at ${baseline}, as a test of this fix must"
                reds=$((reds + 1))
            fi
            ;;
        qa-suite/*.spec.ts)
            if [ -z "$APP_URL" ]; then
                emit "$f" playwright deferred "needs the ephemeral app with the pre-fix class swapped in"
                skipped=$((skipped + 1))
            else
                emit "$f" playwright deferred "app-url given but the swap-and-run step is not implemented yet"
                skipped=$((skipped + 1))
            fi
            ;;
        *) emit "$f" unknown skipped "not a recognised test path"; skipped=$((skipped + 1)) ;;
    esac
done

jq -nc --argjson r "$reds" --argjson g "$greens" --argjson s "$skipped" \
    '{summary: {red: $r, green: $g, deferred: $s}}'
[ "$greens" -eq 0 ] || exit 8
