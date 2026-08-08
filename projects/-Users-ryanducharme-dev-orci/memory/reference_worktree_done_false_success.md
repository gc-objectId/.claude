---
name: worktree-done-false-success
description: "worktree-done now handles squash merges and verifies its own result — trust the exit code, stop re-checking by hand"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b2316851-3433-41f5-ab26-841372a03a54
  modified: 2026-08-07T20:28:52.584Z
---

**Trust the exit code.** As of 2026-08-07 `~/.zshrc` `worktree-done()` verifies its own teardown before returning, so there is nothing to re-check:

- **0** — worktree directory gone, local branch gone, no stale entry in `git worktree list`. All three are actually asserted, not assumed.
- **1** — `git worktree remove` failed (usually untracked strays). Fix and rerun, or `git worktree remove --force`.
- **2** — the branch is genuinely not merged into `origin/main`; the worktree was removed and the branch deliberately left. Surface this rather than forcing it.
- **3** — teardown incomplete; specific WARNING lines say which check failed.

**Squash merges are handled automatically.** `git branch -d` refuses them, because a squashed branch's commits never land on main — only their combined tree does. The function now fetches, replays the branch tree as one commit off the merge base, and asks `git cherry origin/main` whether main already carries an equivalent patch; only on a positive match does it `git branch -D`. It compares against `origin/main`, not local `main`, which is routinely stale — that alone broke the naive version.

Known-safe failure mode: if the squash commit on main differs textually from the branch diff (conflicts resolved at merge time, or main moved and the squash was computed against a newer base), patch-ids won't match and you get exit 2 instead of an auto-delete. That is conservative by design — verify the PR merged, then `git branch -D` yourself.

⚠️ Shell-function changes take effect in **new** shells only; a session's shell snapshot freezes the old function at startup. Invoke through `zsh -ic '...'` to pick up the current definition mid-session.
