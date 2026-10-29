---
name: or3124-qa-report-stale-task
description: "OR-3124 DONE 2026-10-28 (#4784, ee74ee985) — dev QA report 404s: 2 ECS tasks, only the upload target knew the new run; fixed by ETag refresh on read"
metadata:
  node_type: memory
  type: project
  originSessionId: 00da3adc-c657-42ec-aa6c-7f3ce3fad2ed
  modified: 2026-10-28T14:00:09.311Z
---

OR-3124 (Task, DONE 2026-10-28, PR #4784 merged as ee74ee985, worktree torn down): intermittent broken screenshots on dev `/qa-suite-report` were NOT the old OR-2646 gap. `guidedor-dev` runs 2 ECS tasks; `QaReportService.lastRun` was per-JVM and read from S3 only at boot, while the uploading task pruned the previous run's content-hashed `data/<sha1>.png` keys from S3. Whichever task did not take the last upload served a stale run with 404 assets, so reloads flipped between fully working and fully broken.

**Fix:** `getLastRun`/`getRunHistory` call `refreshFromS3IfStale()` — HEAD on `current-stats.json`, compare ETag, reload stats + history and wipe local `playwright-report/` when moved. Throttle is `qa.report.s3.refresh-seconds` (default 30); refresh skips while `uploadLock` is held. Red check: disabling the refresh fails 3 of the 4 new tests.

**How to apply:** when a dev-only feature keeps state in JVM memory, remember dev is 2 tasks behind a round-robin ALB. "Works on reload sometimes" on dev is the signature. Post-deploy proof still worth a glance: the non-upload dev task should log `Refreshed QA report from S3` on its first page view after the next QA Suite run.
