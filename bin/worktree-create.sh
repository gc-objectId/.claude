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
QA_ENV_DEV_REL="${QA_ENV_DEV_REL:-qa-suite/.env.dev}"

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

# Re-running against an existing worktree would force-move the branch onto a fresh main.
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

# A half-built worktree would make every retry hit the already-exists guard.
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

# The dev env file is optional: test:dev needs it, test:local does not.
env_dev_source="${ORCI_ROOT}/${QA_ENV_DEV_REL}"
env_dev_note="no ${QA_ENV_DEV_REL} in ${ORCI_ROOT} — run qa-suite/gen-env.sh aws-dev before test:dev"
if [ -f "$env_dev_source" ]; then
    ln -s "$env_dev_source" "${dir}/${QA_ENV_DEV_REL}" ||
        die "failed to symlink ${QA_ENV_DEV_REL} into the worktree at ${dir}/${QA_ENV_DEV_REL}"
    env_dev_note="${QA_ENV_DEV_REL} symlinked from ${env_dev_source}"
fi

# Assign only an unassigned ticket: a validation ticket stays with its developer.
assignee=$(jira_issue_field "$ticket" assignee 'assignee.displayName' 2>/dev/null || true)
if [ -n "$assignee" ]; then
    assign_note="assigned to ${assignee} (unchanged)"
elif me=$(jira_myself_account_id 2>/dev/null) && [ -n "$me" ] && jira_assign "$ticket" "$me" 2>/dev/null; then
    assign_note="assigned to you"
else
    assign_note="WARNING: couldn't assign ${ticket} (no keychain token / offline) — assign it in Jira by hand"
fi

say ''
say 'Worktree ready:'
say "  Dir:    $dir"
say "  Branch: $branch"
say "  ${QA_ENV_REL} symlinked from ${env_source}"
say "  ${env_dev_note}"
say "  ${ticket}: ${assign_note}"
say ''

printf '%s\n' "$dir"
