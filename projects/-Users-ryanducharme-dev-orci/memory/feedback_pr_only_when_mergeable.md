---
name: feedback-pr-only-when-mergeable
description: "Open the draft PR only when the branch is actually mergeable — for design-epic children that means after the rebaseline PNGs are committed; Ryan merges drafts promptly and merged OR-2996 before its rebaseline landed"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 7f3d4fc8-b481-4280-b4ca-5e4268063517
  modified: 2026-10-05T17:26:36.445Z
---

Do not open a draft PR while a known commit is still owed on the branch (a CI rebaseline, a pending
artifact, a follow-up fix). Ryan reads "draft PR open" as "ready for me to merge" and merges fast.

**Why:** On OR-2996 (2026-10-05) the draft PR opened with the before-restyle baselines for VIS-013–018 while
the rebaseline dispatch was still running; Ryan merged within minutes and the epic branch carried stale
baselines until a follow-up PR. His reaction: "Sigh next time don't open the PR until we're ready."

**How to apply:** For OR-2863 children, the close-out order is: restyle commit → push → rebaseline dispatch →
download → commit PNGs → push → *then* `gh pr create --draft`. If a PR must exist earlier (e.g. to run the
PR gate), say in the summary that it is not mergeable yet and why, in the first line. Same rule for any
ticket whose verification has a CI-produced artifact still to land.

See [[feedback-draft-prs]], [[or2863-child-session-sop]].
