---
name: feedback_green_light_closeout
description: "\"All tests green\" is standing authorization to run the full close-out: commit → push → draft PR → Jira validation comment → close ticket"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a4918fe8-dea8-4069-bceb-91043601c649
  modified: 2026-07-22T20:29:53.349Z
---

When Ryan replies that all tests are green (or equivalent confirmation the work passes locally), that is standing authorization to run the **entire** close-out sequence without pausing between steps:

1. commit
2. push (`--force-with-lease` if the branch was rebased)
3. `gh pr create --draft` (only if no PR exists yet — otherwise the push updates the open PR in place)
4. add the validation comment to the Jira ticket (in Claude's voice; posting it here is fine, unlike PR replies)
5. transition the ticket to Done **if/when appropriate** — i.e. the ticket's work is actually complete/merged and closing it makes sense; skip if there's remaining work or it's premature

**Why:** Established 2026-07-17 (OR-2440 session). Ryan explicitly asked to make this the SOP so a green-light reply doesn't require re-confirming each step. It refines [[confirm-before-push]] — the gate there is for *autonomous* actions; a green-light reply is the explicit instruction that opens the whole sequence.

**How to apply:** On "all tests green" → execute 1–5 in order. Use judgment on step 5 (the "if/when appropriate" is real — don't close a ticket whose PR is still in review unless Ryan's own SDLC merges-before-validation makes Done correct). This does NOT override [[feedback_pr_replies_manual]] — PR reply text is still drafted for Ryan to post, not posted by me. Relates to [[feedback_git_pr_workflow]] and [[feedback_validation_protocol]].
