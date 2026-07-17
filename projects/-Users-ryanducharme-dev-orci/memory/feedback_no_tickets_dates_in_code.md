---
name: no-tickets-dates-in-code
description: "Never put Jira ticket numbers, dates, or PR refs in code or companion md files — describe the code/case only"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 37ca1aff-9dd4-4404-b431-f8985252dc7d
---

No Jira ticket numbers, dates, or other change-tracking references in code, test files, or qa-suite companion `.md` docs. Section comments like `// --- OR-2557: Practitioner ---`, doc headers like `## Manual validation (OR-2441)`, and dated notes like "Observed on dev (2026-07-16)" are all violations — name the command/feature/case instead.

**Why:** the artifacts should describe what the code/case *is*, not the ticket history behind it — provenance lives in commits, PRs, and Jira. Ticket refs go stale and force readers to cross-reference.

**How to apply:** when adding sections to specs or companions, key them by command/feature name ("Get Conditions"), not ticket. Strip any refs found while touching a file. Commit messages and PR titles still carry the ticket number as usual. Related: [[concise-code-comments]].
