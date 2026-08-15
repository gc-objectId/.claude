#!/bin/sh
# Removes a ticket worktree and its branch, then verifies the removal actually happened
# so callers can trust the exit code instead of re-checking by hand.
#
#   worktree-teardown.sh [worktree-dir]     (defaults to $PWD)
#
# Exit: 0 worktree and branch gone (verified), 1 error, 2 branch unmerged and left in place,
#       3 teardown incomplete — see warnings.
set -eu

ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"
WORKTREE_ROOT="${WORKTREE_ROOT:-$HOME/dev/worktrees}"

say() { printf '%s\n' "$*" >&2; }

dir="${1:-$PWD}"

case "$dir" in
    "${WORKTREE_ROOT}/"*) ;;
    *)
        say "Not a worktree under ${WORKTREE_ROOT} — aborting: ${dir}"
        exit 1
        ;;
esac

branch=$(git -C "$dir" branch --show-current 2>/dev/null || true)

verify() {
    bad=0
    if [ -e "$dir" ]; then
        say "WARNING: $dir still exists on disk."
        bad=1
    fi
    if [ -n "$branch" ] && git -C "$ORCI_ROOT" show-ref --quiet --verify "refs/heads/$branch"; then
        say "WARNING: local branch $branch still exists."
        bad=1
    fi
    if git -C "$ORCI_ROOT" worktree list --porcelain | grep -qx "worktree $dir"; then
        say "WARNING: git still lists a worktree at $dir — run: git worktree prune"
        bad=1
    fi
    if [ "$bad" -ne 0 ]; then
        say "Teardown INCOMPLETE — see warnings above."
        return 3
    fi
    say "Done. Worktree and branch removed (verified)."
    return 0
}

if ! git -C "$ORCI_ROOT" worktree remove "$dir" 2>/dev/null; then
    say "FAILED to remove worktree at $dir — resolve the issue (uncommitted changes? use"
    say "'git worktree remove --force') and retry."
    exit 1
fi
say "Worktree removed: $dir"

if [ -z "$branch" ]; then
    verify || exit $?
    exit 0
fi

if ! git -C "$ORCI_ROOT" show-ref --quiet --verify "refs/heads/$branch"; then
    say "Branch $branch already gone."
    verify || exit $?
    exit 0
fi

if git -C "$ORCI_ROOT" branch -d "$branch" 2>/dev/null; then
    say "Deleted local branch: $branch"
    verify || exit $?
    exit 0
fi

# -d refuses a squash-merged branch: its commits never land on main, only their combined tree
# does. Replay that tree as one commit off the merge base and ask whether origin/main already
# carries an equivalent patch. Compare against origin/main; local main is routinely stale.
git -C "$ORCI_ROOT" fetch --quiet origin 2>/dev/null || true
base=$(git -C "$ORCI_ROOT" merge-base origin/main "$branch" 2>/dev/null || true)
tree=$(git -C "$ORCI_ROOT" rev-parse "$branch^{tree}" 2>/dev/null || true)
if [ -n "$base" ] && [ -n "$tree" ]; then
    probe=$(git -C "$ORCI_ROOT" commit-tree "$tree" -p "$base" -m 'squash-merge probe' 2>/dev/null || true)
    if [ -n "$probe" ] &&
        [ "$(git -C "$ORCI_ROOT" cherry origin/main "$probe" 2>/dev/null | cut -c1)" = '-' ]; then
        if git -C "$ORCI_ROOT" branch -D "$branch" >/dev/null 2>&1; then
            say "Deleted local branch: $branch (squash-merged into origin/main)"
            verify || exit $?
            exit 0
        fi
    fi
fi

say "Branch $branch is NOT merged into origin/main — left in place, worktree already removed."
say "Delete manually once you are sure it is safe: git branch -D $branch"
exit 2
