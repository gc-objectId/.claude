---
name: feedback-check-stacked-prs-before-acting-on-review
description: "Before addressing PR review feedback, check for PRs the reviewer opened against the branch and for top-level PR comments, not just inline threads"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 61670fd0-1564-4253-9424-549e00aa7365
  modified: 2026-11-25T14:31:22.291Z
---

Before acting on review feedback for a PR, list PRs targeting that branch (`gh pr list --base <branch> --state all`) and read the top-level conversation comments, not only the inline review threads.

**Why:** On OR-3204 (2026-11-18/19) Theo left four inline comments on #4867, then that evening opened #4878 stacked on Ryan's branch to cut the scope down. The session only read the inline comments, expanded the PR in the opposite direction, and force-pushed, orphaning Theo's base. Five days and a lot of work were lost; #4867 was closed unmerged. This is my (Claude's) reading of what went wrong; Ryan did not state it as a rule.

**How to apply:** Any time Ryan says there is feedback on a PR. A reviewer's own PR is a stronger signal of intent than their inline comments. Also check before any force-push to a branch that could be another PR's base. Related: [[or3204-startup-admin-token]].
