---
name: feedback-pr-test-plans
description: Only include a test plan in PR descriptions if there is something verifiable before merge
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4a812ec4-3077-4bf1-a7dd-663cbe3994b5
---

Do not add a test plan section to PR descriptions unless there are concrete steps that can be verified before the PR is merged (e.g. unit tests passing, a UI change that can be reviewed in a preview, a local repro that can be confirmed).

**Why:** Test plans that only apply post-merge (e.g. "deploy to dev and verify X") are noise in the PR description — they can't be acted on during review and clutter the description.

**How to apply:** If the only verification steps require a deployment or merge-first action, skip the test plan section entirely. Move those steps to the Jira ticket as acceptance criteria or a comment instead.
