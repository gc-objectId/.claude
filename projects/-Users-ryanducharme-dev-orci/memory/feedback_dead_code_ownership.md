---
name: dead-code-ownership
description: "Ryan's rule for dead code found mid-ticket — delete it in the story that made it dead; otherwise file a tech-debt ticket, never a silent \"separate cleanup\""
metadata:
  node_type: memory
  type: feedback
  originSessionId: 62fc9372-38d8-4d58-a054-519dcdacf46c
  modified: 2026-10-14T17:51:51.836Z
---

When a ticket surfaces dead code, ownership decides what happens: if the code was made dead by the
story being worked, delete it in that story's PR. If another story made it dead, file a tech-debt
ticket (Task) naming that story and move on. Do not leave it as an unticketed "separate cleanup" note.

**Why:** Ryan (2026-10-14, OR-3043) does not consider removing code the current change orphaned to be
scope creep; it is part of the change. Dead code orphaned elsewhere is still debt, and debt that is not
ticketed is forgotten.

**How to apply:** `git log -S<symbol>` to find the commit that dropped the last use; map it to its
ticket. Same ticket → delete now (no behavior change, say so in the PR). Different ticket → create the
Task under the relevant epic with the orphaning story named, and reference it where the spec or code
mentions the dead path. See [[project-or3043-baseline-feature-specs]] (OR-3051 is the example).
