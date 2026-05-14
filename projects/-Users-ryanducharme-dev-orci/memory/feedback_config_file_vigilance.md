---
name: feedback-config-file-vigilance
description: Always audit Spring config file diffs before staging — local testing overrides must never slip into commits
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4a812ec4-3077-4bf1-a7dd-663cbe3994b5
---

Before staging or committing any changes to `application.yml`, `application-*.yml`, or any Spring config file, explicitly audit every changed line and confirm it belongs on that branch.

**Why:** `tenants.demo.qa.enabled: true` was added to the base `application.yml` during local OR-2477 testing and slipped through into the OR-2384 epic PR unnoticed. Config files are easy to forget about when staging broad diffs.

**How to apply:** When `git diff` or `git status` shows any `application*.yml` modified, pause and review the diff line-by-line before staging. Local testing overrides (QA tenant flags, feature flags, debug settings, local-only credentials) must be removed or confirmed intentional before committing. If uncertain, flag it for Ryan to review.
