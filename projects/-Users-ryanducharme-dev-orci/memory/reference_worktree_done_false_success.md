---
name: worktree-done-false-success
description: "worktree-done prints \"Done. Worktree removed.\" even when removal/branch-delete failed — always verify"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 7db59caa-cbb0-46b3-b808-9206670a4ca0
---

**FIXED 2026-07-21** in `~/.zshrc` `worktree-done()`: now checks `git worktree remove`'s exit status (aborts with `return 1` + a `--force` hint if it fails), and reports branch state honestly — "Worktree and branch removed" (both gone), "already gone", or "NOT fully merged — left in place" with a `git branch -D` hint and `return 2`. No more unconditional "Done." ⚠️ Takes effect in NEW shells/sessions only — a session's shell-snapshot froze the old buggy function at startup, so already-open worktree sessions still have it until they restart.

Original bug (pre-fix): printed "Done. Worktree removed." unconditionally — even when `git worktree remove` refused (untracked files present) and the branch delete was skipped. Squash merges always trip the branch check since the tip is never an ancestor of main.

**How to apply:** with the fix, trust the exit status/message. In a stale session (old snapshot), still verify with `git worktree list` and `git branch --list "*NNNN*"` from `~/dev/orci`. Untracked strays block removal — delete them and rerun (or `git worktree remove --force`). For squash-merged branches, confirm the PR is MERGED via `gh pr view`, then `git branch -D`.
