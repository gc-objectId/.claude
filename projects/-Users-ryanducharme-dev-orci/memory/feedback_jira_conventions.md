---
name: Jira ticket conventions
description: How Ryan wants Jira tickets managed — lifecycle is manual, descriptions factual
type: feedback
originSessionId: 334727a1-469f-4329-adb2-b6df2acca153
modified: 2026-08-07T20:31:35.449Z
---
Ryan manages Jira ticket lifecycle **manually** — do NOT auto-assign or auto-transition status (changed 2026-06-04 in global CLAUDE.md; reverses the earlier "assign + transition to In Progress on start, Done on merge" rule). A GitHub–Jira integration may also move status automatically on merge.

**Sanctioned exceptions (2026-07-23):**
- The verified close-out — see [[feedback_green_light_closeout]]. When tests pass in a workon ticket flow — your own run, or Ryan reporting all green — posting the mode-appropriate Jira comment and transitioning to Done is part of the authorized sequence.
- The VALIDATE-mode deploy-ready close-out: as soon as manual validation reaches a deploy-ready verdict, post the validation comment and move the ticket to Done immediately — no ask — don't wait for the automation/tests PR. The Done transition signals the team the change is deploy-ready; automation work continues afterward under the normal flow. If validation surfaced a gap needing a code fix, the deploy-ready verdict lands when that fix merges — run the same close-out then (post comment + Done, no ask); do NOT fall into the "ask whether to move it" cleanup fallback, which is only for genuinely ambiguous completeness. Canonical in the workon skill.

Create and edit ticket *content* freely when asked, but leave assignee and status alone unless Ryan explicitly says to set them.

Epic descriptions should be concise and factual:
- Use phase labels like "Complete" or "Pending" — let ticket statuses convey detailed state
- Do not add "PR pending", "approved plan", or similar editorial commentary — it can confuse other readers
- PRs are linked automatically via GitHub integration, don't mention them manually
- Comments are fine for additional context if needed
- No empty parent tickets — repurpose or create with real content
- Show draft tickets for approval before creating — unless Ryan says to create them all at once

**Why:** Ryan owns his board's workflow and wants control over assignment/status; automated changes interfere with that and the GitHub integration. Theo and others read the epic, so editorial language like "approved plan" implies approval that hasn't happened — keep it factual.

**How to apply:** State facts (Complete, Blocked, Deferred) in descriptions and let the Jira workflow do the rest. Relates to [[feedback_git_pr_workflow]].
