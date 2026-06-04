---
name: git-push-and-pr-creation
description: I run git push and gh pr create when explicitly instructed — follow multi-step git instructions fully in sequence
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 15944005-6ab7-49f8-ac18-caa8b5200f1f
---

Run `git push` and `gh pr create` myself when Ryan's instruction includes them. Do not hand the command over for Ryan to run.

**Why:** Ryan uses explicit multi-step instructions ("commit and push", "commit, push, and create PR") as the authorization. Execute each named step in order without stopping between them.

**How to apply:** Follow the instruction completely. Only pause if the next step wasn't named. See [[confirm-before-push]] for the full rule.
