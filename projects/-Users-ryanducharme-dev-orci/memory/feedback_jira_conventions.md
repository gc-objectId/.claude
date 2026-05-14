---
name: Jira ticket conventions
description: How Ryan wants Jira tickets managed — statuses, assignments, descriptions
type: feedback
originSessionId: 334727a1-469f-4329-adb2-b6df2acca153
---
When starting a ticket: assign to Ryan and transition to In Progress.
When a ticket's PR is merged: then transition to Done and strikethrough the ticket in the epic description.
Do NOT transition to Done or strikethrough the epic entry when the PR is only open/in review — only on merge.

Epic descriptions should be concise:
- Use phase labels like "Complete" or "Pending" — let ticket statuses convey detailed state
- Do not add "PR pending", "approved plan", or similar editorial commentary — it can confuse other readers
- PRs are linked automatically via GitHub integration, don't mention them manually
- Comments are fine for additional context if needed
- No empty parent tickets — repurpose or close them

**Why:** Theo and others read the epic; editorial language like "approved plan" implies organizational approval that hasn't happened. Keep it factual.

**How to apply:** When updating the epic, state facts (Complete, Blocked, Deferred) and let the Jira workflow do the rest.
