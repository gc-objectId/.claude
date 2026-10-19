---
name: feedback-followups-go-under-or3054
description: "Follow-ups found while working design-foundation children go in as children of OR-3054 with OR-3084's Working block; never linked to the design epic"
metadata:
  node_type: memory
  type: feedback
  originSessionId: d1bb72f9-01e2-4f33-b51d-cb0fc0c2eb86
  modified: 2026-10-19T13:33:05.431Z
---

Any follow-up found while working (stated 2026-10-16, during an OR-2863 child) is filed as a child of **OR-3054**, with its
"## Working this ticket" block copied verbatim from **OR-3084** (epic branch `epic/OR-3054-admin-ia-and-cleanup`, Vite
3013, cascade vs `origin/main`, CI-only snapshots, close-out comment rules), swapping in the new key after creation.
Do **not** link it to the design epic, and keep the design epic's key, its branch name and its children's keys out of
the new ticket's text and comments.

**Why:** OR-3054 takes everything filed for after the design epic; Ryan cleans up redundant epic links by hand, and the
Jira automation links any key a comment mentions (see [[jira-automation-links-mentioned-keys]]).

**How to apply:** first search OR-3054's children (`parent = OR-3054`) for the same problem — OR-3088 was filed and closed
as a duplicate of OR-3086 because this step was skipped. Then show the draft first (normal ticket-approval rule), create with `parent: OR-3054`, verify `issuelinks`
is empty, then add the key to OR-3054's Outcome follow-up list and the fitting Sequence step (Ryan approved that for
OR-3086). OR-3054's own text naming OR-2863 is fine. OR-3054 stops taking children once its PR opens.
See [[project-or2863-design-foundation]].
