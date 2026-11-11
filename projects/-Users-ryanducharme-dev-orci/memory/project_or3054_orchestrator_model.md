---
name: project-or3054-orchestrator-model
description: "OR-3054 runs as one orchestrator session that spawns a worker agent per ticket (or small related group); small PRs to main, terse human-facing text"
metadata:
  node_type: memory
  type: project
  originSessionId: caa32ff0-2391-4994-82bc-81daf928c375
  modified: 2026-11-10T19:49:33.383Z
---

Since 2026-11-10 Ryan runs OR-3054 through one orchestrator session. It spawns a background agent per ticket or
small related group; the agent runs `~/.claude/bin/worktree-create.sh OR-NNNN slug` (the `workon` function minus the
cd), follows the `workon` skill, opens a draft PR to `main`, and posts the Jira comment. Ryan merges.

**Why:** the design-foundation PR was 337 files; Ryan wants small reviewable chunks and everything human-facing short.

**How to apply:** brief each agent with hard caps (PR body 1-2 sentences + at most 4 bullets; Jira comment at most 5
lines), no sibling/epic keys in comments, no Done transition, questions come back to the orchestrator (agents cannot
reach Ryan). The orchestrator reads the PR diff and posted text before reporting. Touch base with Ryan when a split
or grouping is debatable. Lanes (serial inside, shared files or spec ids): Event Center 3094 → 3114 → 3177 → 3120;
admin pages 3113 → 3085; CSS 3066 → 3084; solo 3086 (first, unblocks parallel qa-suite runs), 3083, 2977, 3087, 3089.
Pilot OR-3178 → draft PR #4831 (4 files, +8/-6). See [[feedback-followups-go-under-or3054]].
