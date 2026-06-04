---
name: confirm-before-push
description: "Execute git actions as explicitly instructed — follow \"commit and push\" fully without stopping between steps"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 15944005-6ab7-49f8-ac18-caa8b5200f1f
---

When Ryan explicitly instructs "commit and push" or "commit, push, and create PR", execute each step in sequence without pausing for confirmation between them. The instruction covers all named steps.

Only pause when the next action is ambiguous or wasn't included in the instruction (e.g., Ryan says "commit" but not "push" — stop after committing).

Do NOT autonomously push or create PRs when not instructed to.

**Why:** The earlier hard-stop rule was put in place after two autonomous pushes in a session. Ryan has since updated the SOP — explicit multi-step instructions should be followed completely. The gate is for autonomous actions, not explicit ones.

**How to apply:** "commit and push" → commit then push, no pause. "commit" alone → commit and stop. "commit, push, and open a PR" → do all three in sequence.
