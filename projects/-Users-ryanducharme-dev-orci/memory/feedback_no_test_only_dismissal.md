---
name: feedback_no_test_only_dismissal
description: Never frame a PR as "test-only / no production code changes" — everything merging to main is production code
metadata:
  type: feedback
  originSessionId: ae5018b9-6fa4-446f-9253-dbeca14ff369
  modified: 2026-07-23T14:26:49.212Z
---

Do not describe a PR as "test-only" with "no production code changes" or similar dismissive framing. Anything that merges to main is production code regardless of directory — if it weren't, there wouldn't be a PR.

**Why:** Ryan flagged this on OR-2526's PR (2026-07-23). The framing is confusing and undersells the change: test code merges to main, runs in CI on every build, and is maintained like any other code.

**How to apply:** If the distinction matters to reviewers, say precisely what is true — "no changes to runtime behavior; the diff is entirely test code" — and then describe the changes on their own merits. Applies to PR descriptions, Jira comments, and commit messages. Relates to [[feedback_git_pr_workflow]] and [[feedback_green_light_closeout]].
