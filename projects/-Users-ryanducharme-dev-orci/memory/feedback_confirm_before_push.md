---
name: confirm-before-push
description: "Push/PR without asking when verification passed or the instruction was explicit; the ask survives only for autonomous actions and the four hard stops"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 15944005-6ab7-49f8-ac18-caa8b5200f1f
  modified: 2026-08-07T20:28:21.556Z
---

Two things open the commit → push → draft PR sequence, and neither needs a confirmation pause:

1. **An explicit instruction.** "commit and push" or "commit, push, and create PR" covers every step it names. Pause only when the next action is ambiguous or wasn't named ("commit" alone → commit and stop).
2. **Your own passing verification** — see [[feedback_green_light_closeout]] and the workon skill's "Verification gate". A green backend unit/integration run *is* the gate.

Still stop and wait when: a test had to change to pass, production code was touched to get green, the run surfaced something about the feature, or the tests are qa-suite e2e against a shared environment. Outside those, do not push or open PRs autonomously — the gate is for unprompted action, not for work whose correctness you have already demonstrated.

**Why:** the original hard stop came from two autonomous pushes in one session. Ryan removed the re-run-the-tests step on 2026-08-07: re-running the same command in the same JVM against the same database catches nothing, and what actually needs a human — is this the right work — happens on the draft PR, not at a terminal gate.

**How to apply:** verification green + no hard stop → run the whole close-out. Hard stop hit → report the specific stop and wait. PRs always open as drafts, so nothing merges without Ryan.
