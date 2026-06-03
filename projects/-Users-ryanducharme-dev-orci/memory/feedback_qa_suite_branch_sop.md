---
name: feedback_qa_suite_branch_sop
description: qa-suite is part of the orci repo — confirm branch before writing qa-suite files
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 637206f3-2dd1-4451-9479-420879c037ee
---

`qa-suite/` is a **subdirectory of the orci repo**, not a separate git repository. It shares the same branch as the rest of orci. Before writing any qa-suite file, confirm the active branch matches the current ticket (`git branch --show-current` from the repo root).

When working in a worktree (`~/dev/worktrees/OR-XXXX-slug/`), qa-suite files in that worktree are already on the feature branch — no separate branch management needed. The worktree IS the isolated checkout.

**Important:** Since qa-suite is part of orci, the worktree constraint applies: if `feature/OR-XXXX` is checked out in a worktree, git will refuse to check it out again in `~/dev/orci`. Tests must be run from inside the worktree (`~/dev/worktrees/OR-XXXX-slug/qa-suite/`), not from `~/dev/orci/qa-suite/`, while the worktree is active.

**Why:** Prior session incorrectly treated qa-suite as a separate git repo, leading to wrong branch-check procedures. Also: in one session TC-018 tests were written onto the wrong ticket's branch because the branch was never confirmed before editing.

**How to apply:** At session start, run `git branch --show-current` once from the repo root — it covers both orci and qa-suite. For worktree sessions, tests run from `~/dev/worktrees/OR-XXXX-slug/qa-suite/`.
