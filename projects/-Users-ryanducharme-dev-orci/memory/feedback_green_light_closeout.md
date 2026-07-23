---
name: feedback_green_light_closeout
description: "\"All green\" is standing authorization for the full close-out: commit → push → draft PR → check ticket status → Jira comment (mode-dependent) → move to Done"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a4918fe8-dea8-4069-bceb-91043601c649
  modified: 2026-07-23T18:58:20.557Z
---

When Ryan replies that all tests are green (or equivalent confirmation the work passes locally), that is standing authorization to run the **entire** close-out sequence without pausing between steps:

1. commit (repo convention `OR-NNNN - Description`, no co-author/generated footers)
2. push (`--force-with-lease` only if the branch was rebased)
3. `gh pr create --draft` (only if no PR exists yet — otherwise the push updates the open PR in place)
4. check the ticket's current Jira status (don't assume)
5. post a Jira comment in Claude's voice, mode-dependent, always linking the PR by full URL:
   - **VALIDATE** (ticket was Ready for Testing/Testing): the validation comment — only if manual validation is complete and passed
   - **IMPLEMENT** (ticket was To Do/In Progress): a comment explaining the fix — root cause, what changed, test coverage
6. transition the ticket to **Done** — gated on step 5 being warranted; if validation failed, work remains, or blockers surfaced, skip both and explain why

**VALIDATE mode has an earlier trigger — the deploy-ready close-out.** As of the 2026-07-23 skill revision, the moment the manual-validation verdict is deploy-ready, post the validation comment AND move the ticket to Done *without waiting for the automation/tests work* — the Done transition is the team's "deploy-ready" signal, and a tests PR usually follows. The comment links the merged implementation PR by full URL. If not deploy-ready: post nothing, skip the transition, surface blockers. When green light then arrives for the tests, the validation comment + Done already happened, so step 5 becomes a short follow-up linking the tests PR + coverage and step 6 is skipped. (If the deploy-ready close-out never fired, post the full validation comment at green light instead.)

Then the flow continues normally: PR feedback loop (replies still drafted, per [[feedback_pr_replies_manual]]), and on Ryan's merge confirmation → `worktree-done` cleanup.

**Why:** Established 2026-07-17 (OR-2440), fully codified 2026-07-23 (OR-2526 session) — Ryan asked to document it in the workon skill because he intends to run an agent pool on tickets with less input from him. The green-light reply is the explicit instruction that opens the whole sequence; it's the sanctioned exception to [[feedback_jira_conventions]]'s no-auto-transition rule and refines [[feedback_confirm_before_push]].

**How to apply:** The canonical sequence lives in `~/.claude/skills/workon/SKILL.md` ("Green light — close-out") — follow it there. On any step failure (push rejected, transition unavailable), stop and surface rather than skipping ahead. Relates to [[feedback_git_pr_workflow]] and [[feedback_validation_protocol]].
