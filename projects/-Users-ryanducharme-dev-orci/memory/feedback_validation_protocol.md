---
name: feedback_validation_protocol
description: "What \"validate\" / \"pull the ticket and validate\" means as a defined SOP"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a8f15aea-c106-4f0e-bd7a-14677b43ae06
  modified: 2026-07-28T13:09:49.671Z
---

When Ryan says "validate" a ticket (e.g. "pull OR-XXXX for context and validate"), it's a defined protocol, not just reading code:

1. Pull the Jira ticket + understand the shipped mechanism/files/acceptance examples.
2. **Manual validation first** — run the positive scenario AND the negative/inverse against the running `main` build. For any "should NOT happen" assertion, **flip the triggering condition so it WOULD happen, confirm the check goes red, then revert** — a green absence assertion is meaningless until you've seen it fail. This flip-and-revert IS the manual-validation step.
3. **Deploy-ready close-out (added 2026-07-23)** — the moment the verdict is deploy-ready, post the validation comment to Jira and move the ticket to Done. Don't wait for the tests PR — the transition tells the team it's deploy-ready; automation work follows. Not deploy-ready → no comment, no transition, surface blockers.
4. **Then automate where applicable** — check existing coverage first (don't duplicate solid unit tests), favor negative/edge cases, apply the same can-it-fail check, and put edge-case/negative rule tests in the supplemental suite (CR-002), not core (CR-001 = mandatory every-run).
5. **Close out after merge** — Ryan returns to the session once the PR merges and confirms it + asks to clean up; that's the cue to run `worktree-done` from inside the worktree, then he exits. If `worktree-done` refuses (unmerged branch), surface it rather than forcing. If validation surfaced a gap that needed a code fix, the deploy-ready close-out (step 3) was deferred — the deploy-ready verdict lands when that fix merges, so run it then: post the validation comment and move the ticket to Done, **no ask**. Don't fall back to "ask whether to move it" — a ticket you validated deploy-ready isn't ambiguous.

**Why:** Established on OR-2546 (2026-06). The flip-check caught a test (TC-019) that was passing for the wrong reason — the alert render lagged the awaited response, so `.not.toBeVisible()` passed for any route. Without the flip, a vacuous test would have shipped.

**How to apply:** Codified in global CLAUDE.md under "## Validation Protocol". Relates to [[feedback_validate_against_main]] and [[feedback_git_pr_workflow]].
