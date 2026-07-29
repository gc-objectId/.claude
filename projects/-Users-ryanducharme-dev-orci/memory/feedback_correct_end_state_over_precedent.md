---
name: correct-end-state-over-precedent
description: "Ryan: aim for the correct structure, not what matches existing precedent; scope creep to fix organization is nearly always OK"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b2b04c6f-42b7-4087-b9f1-46a895efc310
  modified: 2026-07-28T14:35:27.614Z
---

On OR-2636 (2026-07-28) I initially defended placing the HL7 viewer e2e in `integrations/` because its closest sibling (Integration Harness) already lived there. Ryan pushed back: "just cause it's precedent doesn't mean it's right."

**Why:** Much of our tooling — the qa-suite especially — is only months old and was grown incrementally through Claude. "This is how it's done here" is weak evidence it's correct; the existing structure is often just an earlier version of my own choices. Following it for consistency compounds the mistake.

**How to apply:** Aim for the correct end-state, not the one that matches precedent. When the existing organization is wrong, propose the reorg that fixes it. Scope creep in service of the correct structure is nearly always acceptable — if fixing a taxonomy means moving sibling files that predate the current task, move them too (call it out first, then do it). Precedent informs; it doesn't bind. Concretely on OR-2636: created a `test-utilities/` qa-suite project mirroring the app's "Test Utilities" admin menu and moved both HL7 viewer (HLV) and Integration Harness (HARN) into it, leaving `integrations/` for external-integration validation (Mayo). Codified in global CLAUDE.md (Code Quality → Correct end-state over precedent).

Related: [[feedback_terse_no_summaries]]
