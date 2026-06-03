---
name: feedback_draft_prs
description: All PRs must be opened in draft mode via gh pr create --draft
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 637206f3-2dd1-4451-9479-420879c037ee
---

Always open PRs as drafts using `gh pr create --draft`. Ryan marks ready for review manually after any final checks.

**Why:** Prevents reviewers from being notified before Ryan has done a final pass.

**How to apply:** Add `--draft` to every `gh pr create` command. No exceptions, including qa-suite PRs.
