---
name: reference_workon_rerun_stale_index
description: "Re-running `workon` for a ticket whose worktree already exists force-moves the branch to new main, leaving the worktree index stale — a week of main shows as staged reversions"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 506a6bbe-fe07-458c-b60f-7154ada844f4
  modified: 2026-07-31T19:33:58.589Z
---

Re-running the `workon` shell function for a ticket that already has a live worktree re-creates the branch at current `origin/main` (reflog shows two "Created from origin/main" entries) without touching the worktree's index/worktree files. Result: `git status` shows the entire delta between old and new main as *staged reversions* — committing would revert weeks of main.

Recovery: `git stash push` (preserves any real WIP mixed in), leaving a clean tree at new main. Diagnose via `git reflog show <branch>` before assuming corruption. Seen on OR-2620 (2026-07). Relates to [[reference_stale_worktree_ci_merge_compile]].
