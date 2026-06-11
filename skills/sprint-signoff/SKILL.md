---
name: sprint-signoff
description: Review a Jira sprint from a doneness perspective and draft a prod-deploy sign-off message for Slack, in Ryan's house format. Use when asked to "review sprint N", "sign off on the deploy", or produce a sprint sign-off. Pass the sprint number as an argument (e.g. /sprint-signoff 84).
---

# Sprint Deploy Sign-off

Produce a doneness review of a Jira sprint and a Slack-ready prod-deploy sign-off message.

## Inputs

- **Sprint number** — from the argument (e.g. `84` → `Sprint 84`). If not given, ask before doing anything else; do not guess.
- **Jira cloud:** `guidedclinical` — cloudId `f0b968d3-2cbb-41a5-ac92-b80f2cd94e76`. If a tool rejects it, re-derive via `getAccessibleAtlassianResources`.

## Steps

### 1. Pull the board

Query the sprint via JQL. **The raw response blows past the tool's token limit** — it gets saved to a file path instead of returned inline. That's expected; don't retry with a bigger `maxResults`. Drop `description` from `fields` (it's the main bloat) and keep it lean:

```
searchJiraIssuesUsingJql(
  cloudId = f0b968d3-2cbb-41a5-ac92-b80f2cd94e76,
  jql = 'sprint = "Sprint <N>" ORDER BY status',
  fields = ["summary", "status", "issuetype", "assignee"],
  maxResults = 100
)
```

Then extract the essentials from the saved file with `jq` (status/assignee are nested objects, so pull `.name`):

```bash
F=<saved file path from the tool error>
jq -r '.issues.nodes[] | "\(.key)\t[\(.fields.status.name)]\t\(.fields.issuetype.name)\t\(.fields.summary)"' "$F" | sort -t'[' -k2
```

### 2. Categorize by status

Group every ticket by its status. Typical buckets: **Done**, **Ready for Testing**, **Testing**, **In Progress**, **To Do**. Only **Done** is a sign-off candidate; everything else rolls to the next sprint.

### 3. Apply doneness judgment

- **Analytics investigation / study tasks** (titles like `Analytics: Investigation:` or `Analytics — ... study`) that are Done are *completed analysis*, not deployable code. List them as completed work but call out that they have **no deploy artifact** — don't imply they ship. Analytics tickets still in `Ready for Testing` / `Testing` are the "few that aren't done" — name them explicitly.
- **Large epic work mid-flight** (e.g. a Mayo Integration push spread across many tasks) usually has a done provisioning/setup story but the integration itself In Progress. Summarize the bucket counts (`X In Progress, Y Ready for Testing, Z To Do`) rather than listing every sub-task.
- **Testing-automation PRs pending on Done items** don't gate the deploy — note them as a caveat (mirrors the Sprint 83 sign-off). Offer to pull individual tickets to confirm this if it matters; don't block on it.

### 4. Output

First, a short review for Ryan: a Done table (ticket → summary), a "not done — rolls forward" list, and any judgment calls flagged. Then the **Slack sign-off draft** in this exact format (it's a draft for Ryan to post — don't send it anywhere):

```
*Sprint <N> — Prod Deploy Sign-off* :rocket:

Reviewed the Sprint <N> board ahead of the prod deploy. The completed and verified work is good to ship:

• OR-XXXX — <summary>
• OR-XXXX — <summary>
...

<optional: any Done items with caveats, e.g. "The last three are verified — only their testing-automation PRs are still pending merge, which doesn't gate the deploy." or completed analysis tasks with no deploy artifact>

Remaining items (<one-line description of the rolled-forward buckets>) roll to the next sprint and aren't part of this deploy.

:white_check_mark: Signing off — clear to proceed with the prod deploy.
```

## Notes

- This is read-only Jira review plus a draft message. Do not transition tickets, comment on Jira, or post to Slack — per Ryan's conventions, he posts sign-offs himself.
- Keep the prose terse and factual — no editorializing.
