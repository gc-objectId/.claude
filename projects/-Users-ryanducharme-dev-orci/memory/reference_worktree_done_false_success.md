---
name: worktree-done-false-success
description: "worktree-done/workon are thin wrappers around scripts in ~/.claude/bin as of 2026-08-14 — trust their exit codes; only stale shell snapshots still hit the old missing-helper bug"
metadata:
  node_type: memory
  type: reference
---

**The logic lives in scripts, not shell functions.** As of 2026-08-14 `~/.zshrc` holds only thin wrappers:

- `workon` → `~/.claude/bin/worktree-create.sh` (prints the new directory on stdout; the wrapper cds into it)
- `worktree-done` → `~/.claude/bin/worktree-teardown.sh` (the wrapper only steps out of the directory being removed)

The private helpers `_worktree-done-verify` and `_jira_branch_prefix` **no longer exist**. Do not look for them, and do not diagnose problems in terms of them.

**Trust the exit codes.** `worktree-teardown.sh` asserts its own result before returning:

- **0** — worktree directory gone, local branch gone, no stale entry in `git worktree list`. All three actually checked.
- **1** — `git worktree remove` failed (usually untracked strays). Fix, or `git worktree remove --force`.
- **2** — branch genuinely not merged into `origin/main`; worktree removed, branch deliberately left. Surface it, don't force it.
- **3** — teardown incomplete; WARNING lines name the failing check.

`worktree-create.sh` uses 0 created / 1 usage-or-error / 3 already exists, and rolls back a partially created worktree so a retry never hits a stranded half-built state.

**Squash merges are handled.** `git branch -d` refuses them because a squashed branch's commits never land on main, only their combined tree does. The script fetches, replays the branch tree as one commit off the merge base, and asks `git cherry origin/main` whether main already carries an equivalent patch; only then `git branch -D`. It compares against `origin/main` — local `main` is routinely stale, which broke the naive version. Conservative failure mode: if the squash on main differs textually (conflicts resolved at merge, or main moved), patch-ids won't match and you get exit 2 instead of auto-delete. Verify the PR merged, then `git branch -D` yourself.

**Stale shell snapshots are the one remaining trap.** A shell that started before 2026-08-14 still has the old inline functions, which call helpers that are no longer in `~/.zshrc` at all:

```
Deleted local branch: feature/OR-XXXX-slug
worktree-done:25: command not found: _worktree-done-verify   <- verify never ran
EXIT: 0
```

That 0 is the last successful command, not an assertion. Any `command not found: _*` line means you are in an old snapshot: re-run via `zsh -ic '...'`, or call the script directly (`~/.claude/bin/worktree-teardown.sh "$PWD"`), which is snapshot-proof. Same shape in the old `workon`: a missing `_jira_branch_prefix` silently fell back to `feature/`, wrong for a Bug or Epic.

Related: [[project_jira_watch_autovalidate]] — the same scripts are what let the validation runner create and tear down worktrees without going through zsh.
