---
name: Git/PR workflow
description: Standard end-to-end flow for all ticket work — Jira, branch, commits, PR, post-merge cleanup
type: feedback
originSessionId: e7f868ae-1b22-4cf8-8154-3cefcbb5ce39
---
Follow this sequence every time work begins on a ticket:

1. Check Jira for the epic/story. Assign to Ryan and transition to In Progress.
2. Run `git status` + `git branch --show-current`. Propose a branch name and wait for approval before creating. Always branch from `main`. Naming: prefix must match the Jira issue type — `epic/OR-XXXX-slug` (Epic), `feature/OR-XXXX-slug` (Story/Task), `bugfix/OR-XXXX-slug` (Bug), `hotfix/` (urgent prod fix); see [[feedback-branch-naming]]. Push to remote immediately after creation.
3. Implement and commit at logical checkpoints (ask before each commit).
4. Provide explicit test steps for Ryan to run locally. Wait for Ryan to confirm testing passed.
5. Tell Ryan it's time to review the local diff. Wait for confirmation before committing or pushing.
6. Commit, push to remote, then open PR via `gh pr create`. Ryan adds reviewers manually.
7. Address PR feedback together. Provide test steps for non-trivial fixes. Prompt Ryan to review the diff again before pushing feedback commits.
8. Ryan merges manually. When Ryan confirms merge: transition Jira to Done, `git checkout main`, `git pull`, prune stale local branches.

**Why:** Ryan established this as the standard flow — consistent across all tickets, removes ambiguity about when to push/PR/close.

**How to apply:** Every ticket from the start. Don't deviate unless Ryan explicitly says so for a specific case.

**Authorization shortcut:** When Ryan confirms "tests pass locally", that is standing authorization to commit + push + open draft PR as a single uninterrupted flow — no additional confirmation gates needed between those three steps.
