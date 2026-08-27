#!/bin/sh
# Decides whether an automation branch is safe to push as a draft PR.
#
#   automate-gate.sh <worktree>
#
# For test-writing work the gate can be far stricter than for validation, because the important
# properties are mechanically checkable rather than matters of trust:
#
#   - only test files changed. A production-code edit on a coverage branch means the tests were
#     bent to fit the code, or the change is not what it claims to be.
#   - nothing was disabled or skipped. The cheapest way to make a suite green is to switch tests
#     off, and that must never reach a PR.
#   - no existing assertions deleted. Weakening a test to accommodate new code is the failure mode
#     Ryan's SOP calls a hard stop.
#
# Exit: 0 safe to push, 1 usage/error, 8 refused (reason on stdout as JSON).
set -eu

ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"

say() { printf '%s\n' "$*" >&2; }
[ $# -eq 1 ] || { say "Usage: automate-gate.sh <worktree>"; exit 1; }
wt="$1"
[ -d "$wt" ] || { say "not a directory: $wt"; exit 1; }

refuse() {
    say "REFUSED: $*"
    jq -nc --arg r "$*" '{safe: false, reason: $r}'
    exit 8
}

base=$(git -C "$wt" merge-base origin/main HEAD 2>/dev/null) || refuse "cannot find a merge base with origin/main"
changed=$(git -C "$wt" diff --name-only "$base"..HEAD)
[ -n "$changed" ] || refuse "no commits on this branch — nothing was written"

# Anything outside these is production code as far as this gate is concerned.
offenders=''
for f in $changed; do
    case "$f" in
        */src/test/*|qa-suite/*|*/src/testFixtures/*) ;;
        *) offenders="${offenders}${f}
" ;;
    esac
done
if [ -n "$offenders" ]; then
    refuse "non-test files changed on a coverage branch: $(printf '%s' "$offenders" | tr '\n' ' ')"
fi

added=$(git -C "$wt" diff "$base"..HEAD -- '*/src/test/*' 'qa-suite/*' | grep '^+' || true)
for pattern in '@Disabled' '@Ignore' '\.skip(' '\.only(' 'test\.skip' 'xit(' 'xdescribe('; do
    if printf '%s' "$added" | grep -qE "$pattern"; then
        refuse "added a skip/disable marker matching '${pattern}' — a suite made green by switching tests off is not coverage"
    fi
done

# Deletions inside existing test files: new files are fine, gutted assertions are not.
removed_asserts=$(git -C "$wt" diff "$base"..HEAD --diff-filter=M -- '*/src/test/*' 'qa-suite/*' |
    grep '^-' | grep -cE 'assert|expect\(|verify\(' || true)
if [ "$removed_asserts" -gt 0 ]; then
    refuse "${removed_asserts} assertion line(s) removed from existing tests — weakening coverage is a hard stop"
fi

file_count=$(printf '%s\n' "$changed" | grep -c . || true)
say "Safe: ${file_count} file(s), all test paths, nothing disabled, no assertions removed"
jq -nc --argjson n "$file_count" --arg files "$(printf '%s' "$changed" | tr '\n' ' ')" \
    '{safe: true, files_changed: $n, files: $files}'
