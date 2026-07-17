---
name: worktree-done-false-success
description: "worktree-done prints \"Done. Worktree removed.\" even when removal/branch-delete failed — always verify"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 7db59caa-cbb0-46b3-b808-9206670a4ca0
---

`worktree-done` prints "Done. Worktree removed." unconditionally — even when `git worktree remove` refused (untracked files present) and the branch delete was skipped ("already gone or not fully merged"). Squash merges always trip the branch check since the tip is never an ancestor of main.

**How to apply:** after running it, verify with `git worktree list` and `git branch --list "*NNNN*"` from `~/dev/orci`. Untracked strays (e.g. files from failed redirects) block removal — delete them and rerun. For squash-merged branches, confirm the PR state is MERGED via `gh pr view`, then `git branch -D`.
