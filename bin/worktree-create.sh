#!/bin/sh
# Creates the git worktree for a ticket and prints its directory on stdout.
# Diagnostics go to stderr so callers can safely do: cd "$(worktree-create.sh OR-1234 slug)"
#
#   worktree-create.sh <ticket> <slug> [feature|epic|bugfix|hotfix]
#
# Exit: 0 created, 1 usage/error, 3 already exists (worktree or branch present).
set -eu

. "${CLAUDE_BIN:-$HOME/.claude/bin}/jira.sh"

ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"
WORKTREE_ROOT="${WORKTREE_ROOT:-$HOME/dev/worktrees}"
QA_ENV_REL="${QA_ENV_REL:-qa-suite/.env.local}"

say() { printf '%s\n' "$*" >&2; }
die() { say "Error: $*"; exit 1; }

[ $# -ge 2 ] || {
    say "Usage: worktree-create.sh <ticket> <slug> [type]"
    say "  type: feature | epic | bugfix | hotfix — match the Jira issue type"
    exit 1
}

ticket="$1"
slug="$2"
type="${3:-}"

printf '%s' "$ticket" | grep -qE '^[A-Z][A-Z0-9]*-[0-9]+$' ||
    die "ticket '$ticket' is not a Jira key like OR-1234."

# hotfix is an urgency call, not a Jira type — it can only ever come from the 3rd argument.
if [ -n "$type" ]; then
    case "$type" in
        feature | epic | bugfix | hotfix) ;;
        *) die "branch type '$type' not recognized — use feature, epic, bugfix, or hotfix." ;;
    esac
else
    issuetype=$(jira_issue_type "$ticket" 2>/dev/null || true)
    case "$issuetype" in
        Bug) type=bugfix ;;
        Epic) type=epic ;;
        Story | Task | Sub-task | Subtask) type=feature ;;
        '')
            type=feature
            say "WARNING: couldn't determine the Jira issue type for ${ticket} (no keychain token / offline / lookup failed)."
            say "         Defaulting to 'feature/'. Pass a 3rd argument, or rename later with 'git branch -m <type>/${ticket}-${slug}'."
            ;;
        *) type=feature ;;
    esac
    [ -n "${issuetype:-}" ] && say "Jira issue type → branch prefix: ${type}/"
fi

branch="${type}/${ticket}-${slug}"
dir="${WORKTREE_ROOT}/${ticket}-${slug}"

[ -d "$ORCI_ROOT/.git" ] || die "$ORCI_ROOT is not a git repository."

# Refusing here is the point: re-running against an existing worktree force-moves the branch
# onto a fresh main, which surfaces later as a week of main showing up as staged reversions.
existing=$(find "$WORKTREE_ROOT" -maxdepth 1 -name "${ticket}-*" -print -quit 2>/dev/null || true)
if [ -n "$existing" ]; then
    say "Refusing: a worktree for ${ticket} already exists at ${existing}"
    exit 3
fi
if git -C "$ORCI_ROOT" branch --list "*${ticket}-*" | grep -q .; then
    say "Refusing: a local branch for ${ticket} already exists:"
    git -C "$ORCI_ROOT" branch --list "*${ticket}-*" >&2
    exit 3
fi

env_source="${ORCI_ROOT}/${QA_ENV_REL}"
[ -f "$env_source" ] || die "${env_source} not found — cannot symlink it into the worktree."

# Creation must be all-or-nothing: a half-built worktree would make every retry hit the
# already-exists guard instead, stranding the ticket.
created=''
rollback_on_failure() {
    st=$?
    if [ "$st" -ne 0 ] && [ -n "$created" ]; then
        say "Rolling back partially created worktree at ${dir}"
        git -C "$ORCI_ROOT" worktree remove --force "$dir" >/dev/null 2>&1 || true
        git -C "$ORCI_ROOT" branch -D "$branch" >/dev/null 2>&1 || true
    fi
    exit "$st"
}
trap rollback_on_failure EXIT

git -C "$ORCI_ROOT" fetch origin >&2 || die "git fetch origin failed."
git -C "$ORCI_ROOT" worktree add -b "$branch" "$dir" origin/main >&2 ||
    die "git worktree add failed for ${branch}."
created=1

ln -s "$env_source" "${dir}/${QA_ENV_REL}" ||
    die "failed to symlink ${QA_ENV_REL} into the worktree at ${dir}/${QA_ENV_REL}"

say ''
say 'Worktree ready:'
say "  Dir:    $dir"
say "  Branch: $branch"
say "  ${QA_ENV_REL} symlinked from ${env_source}"
say ''

printf '%s\n' "$dir"
