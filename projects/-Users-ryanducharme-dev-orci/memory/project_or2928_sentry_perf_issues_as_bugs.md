---
name: or2928-sentry-perf-issues-filed-as-bugs
description: "OR-2928/2934/2883 job-cleaner \"bugs\" were Sentry N+1 performance detections; triage script now error-only; cleaner is metadata-driven (PR #4606)"
metadata:
  node_type: memory
  type: project
  originSessionId: faff20d5-69c6-4a4d-9fb6-ec32896b8a1f
  modified: 2026-09-30T14:54:47.996Z
---

OR-2928, OR-2934, OR-2883, OR-2916 and OR-2923 (job-cleaner.job-cleaner-<tenant>) were Sentry **N+1 Query performance
issues** (level info, `interface_type=spans`), not errors. The triage script titled them after the
transaction because the event had no exception (`in_app_frames=0` in the triage run log is the tell).
PR #4592 (cross-tenant cleaner fix, 2026-09-29) was a guess at the cause; the loop validated the guess
faithfully and Sentry reopened the ticket on the fixed build the next hour.

Fix on PR #4606 (draft, split 2026-10-02 after Theo hesitated on the Java change): triage only,
`sentry_triage.py` searches `issue.category:error` and drops non-error payloads. The metadata-driven
cleaner (`QuartzJobService.cleanStaleJobs`, one query on the tenant's incomplete `job_metadata` older
than 36h) is parked on `bugfix/OR-2947-metadata-driven-cleaner` (commit 704c7a8a4) and proposed on
OR-2947. After merge the five Sentry issues must be **archived**, not resolved, or they reopen the tickets.

**Why:** a Sentry-created ticket with a bare transaction name as its title and "Related PR: None
identified" has no stack trace because there is no exception. Check the Sentry issue type before
treating it as a bug.

**How to apply:** open the Sentry link in Chrome (Ryan must be signed in there; the tab title shows
the issue type immediately). Local credential lookups for Sentry are denied, CloudWatch/ECS reads are
IAM-denied, dev RDS needs VPN. `findIncompleteJobMetadata` in JobMetadataRepository is dead code.
See [[sentry-events-have-no-release]], [[jira-watch-validation-loop]].
