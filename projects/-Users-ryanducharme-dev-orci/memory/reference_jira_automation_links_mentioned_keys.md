---
name: jira-automation-links-mentioned-keys
description: "A Jira Automation rule links an issue to every issue key mentioned in a comment on it (confirmed 2026-10-15 on OR-2992: comment naming epic/OR-2863-design-foundation and OR-2999 → Relates links 2 s later). Keep epic keys and sibling keys out of child-ticket comments, or the epic fills with redundant child links."
metadata:
  type: reference
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
---

Evidence: OR-2992 comment at 15:13:34 ("PR #4701 into `epic/OR-2863-design-foundation` … OR-2999") →
"Automation for Jira" added Relates links to OR-2863 and OR-2999 at 15:13:36–37. Description edits on the
epic itself did not trigger it; comments (and possibly description edits on stories) do. Every child close-out
comment that named the epic branch produced a child→epic link Ryan then deleted by hand.

**How to apply:** in close-out comments on a child, say "into the epic branch" and link the PR; never write
`OR-2863` (or the branch name, which contains it) or sibling keys in the comment body. The durable fix is
Ryan's: Project settings → Automation → Audit log at the link timestamp names the rule; add a condition that
the matched key is not `{{issue.parent.key}}` (or exclude Epics), or restrict the trigger. See
[[or2863-child-session-sop]].
