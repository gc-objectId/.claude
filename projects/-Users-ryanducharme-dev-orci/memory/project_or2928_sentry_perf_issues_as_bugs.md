---
name: or2928-sentry-perf-issues-filed-as-bugs
description: "OR-2928/2934/2883/2916/2923 job-cleaner \"bugs\" are Sentry N+1 detections; our PR #4606 closed 2026-10-05, superseded by Theo's #4627; cleaner rework parked on bugfix/OR-2947-metadata-driven-cleaner; worktree kept on purpose"
metadata:
  node_type: memory
  type: project
  originSessionId: faff20d5-69c6-4a4d-9fb6-ec32896b8a1f
  modified: 2026-10-05T17:15:42.357Z
---

OR-2928, OR-2934, OR-2883, OR-2916 and OR-2923 (job-cleaner.job-cleaner-<tenant>) are Sentry **N+1 Query
performance issues** (level info, `interface_type=spans`) on the hourly cleaner, which loads every Quartz
trigger one at a time (`QuartzJobService.getStaleJobKeys`). No exception, so the triage script titled them
after the transaction (`in_app_frames=0` in the triage run log is the tell). PR #4592 (cross-tenant fix,
2026-09-29) was a guess; the loop validated the guess and Sentry reopened the ticket the next hour.

**State as of 2026-10-05**
- Our PR #4606 (triage error-only) is CLOSED, superseded by Theo's PR #4627
  (https://github.com/guidedclinical/orci/pull/4627): performance issues keep getting tickets but titled
  with the detection and the parameterized SQL evidence. So these five tickets stay legitimate work items
  for the N+1 itself, not noise to filter.
- The metadata-driven cleaner (one query on the tenant's incomplete `job_metadata` older than 36h, delete
  those keys from both schedulers, close orphans; drops the #4592 ownership check; unit + integration
  tests) is parked at commit 704c7a8a4 on `bugfix/OR-2947-metadata-driven-cleaner`, pushed, no PR. Proposed
  on OR-2947 in a comment. It is the natural fix for the five tickets once #4627 lands.
- Worktree `~/dev/worktrees/OR-2928-job-cleaner-demo-qa` (branch `bugfix/OR-2928-job-cleaner-demo-qa`,
  triage-only commits) was **kept deliberately** for reference. Prune with `worktree-done` after #4627
  merges or whenever; it will refuse as unmerged, confirm with `git diff origin/main <tip>` then `branch -D`.
- The five tickets' Jira comments still say "fix in PR #4606, N+1 parked under OR-2947"; update them when
  the cleaner rework gets its real PR. Archive the Sentry issues only once the N+1 is actually gone.

**How to apply:** open Sentry links in Chrome (Ryan must be signed in; the tab title shows the issue type).
Local Sentry credentials, CloudWatch/ECS reads and dev RDS without VPN are all blocked.
`findIncompleteJobMetadata` in JobMetadataRepository is dead code.
See [[sentry-events-have-no-release]], [[jira-watch-validation-loop]].
