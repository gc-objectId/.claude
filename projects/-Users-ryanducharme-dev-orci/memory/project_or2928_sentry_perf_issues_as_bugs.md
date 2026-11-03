---
name: or2928-sentry-perf-issues-filed-as-bugs
description: HANDOFF for OR-2947 session — five job-cleaner tickets (OR-2928/2934/2883/2916/2923) are Sentry N+1 detections; the metadata-driven cleaner fix is parked at commit 704c7a8a4, applies cleanly to main; exact steps inside
metadata:
  type: project
---

# Handoff: close the five job-cleaner tickets from the OR-2947 session (written 2026-11-02)

**What the five tickets are.** OR-2928, OR-2934, OR-2883, OR-2916, OR-2923 (`job-cleaner.job-cleaner-<tenant>`)
are Sentry **N+1 Query performance issues** (level info), not errors. The hourly cleaner
(`QuartzJobService.getStaleJobKeys`) loads every Quartz trigger for every tenant one at a time, two queries
per trigger. Theo's PR #4627 (merged 2026-10-07) now files such detections with their SQL evidence, so these
stay real tickets for the N+1 itself. All five: To Do, assigned to Ryan, "relates to" OR-2947. Jira autofix is
gone from main, so nothing else will touch them.

**The fix already exists.** Commit `704c7a8a4`, reachable only via `origin/bugfix/OR-2947-metadata-driven-cleaner`
(and `origin/bugfix/OR-2928-job-cleaner-demo-qa`); run `git fetch origin` before the checkout below. No local
branch or worktree for it remains (torn down 2026-11-02 so `workon OR-2947 <slug>` starts fresh from main):
- `QuartzJobService.cleanStaleJobs(hours)`: one query on the tenant's own incomplete `job_metadata` with
  `created_date` older than 36h, `deleteJob(key)` on both schedulers, close metadata whose job is already gone.
  Tenant-scoped by the schema, so the `isOwnedBy` check from PR #4592 and the second 36h metadata sweep go away.
- `JobMetadataRepository.findByCompletedFalseAndCreatedDateBefore` replaces `markStaleJobMetadataAsComplete`.
- `JobCleanerJob.clean()` just delegates. Cleaner jobs have no metadata so they are never deleted.
- Tests: new `QuartzJobServiceTest` (unit, 4) and rewritten `JobCleanerJobIntegrationTest` (6, schedules through
  the production path and backdates `created_date` by JDBC). Both passed 2026-09-30.
- Verified 2026-11-02: `git merge-tree` against origin/main shows no conflicts; main only added
  `wasScheduled`/`existsByJobNameAndJobGroup` nearby.

**Do NOT take the triage-script part of that commit.** `.github/scripts/sentry_triage.py` and
`test_sentry_triage.py` in 704c7a8a4 are superseded by #4627. Take the Java files only:

```bash
git checkout 704c7a8a4 -- \
  orci-repositories/src/main/java/com/guided/orci/repository/JobMetadataRepository.java \
  orci/src/main/java/com/guided/orci/quartz/JobCleanerJob.java \
  orci/src/main/java/com/guided/orci/service/quartz/QuartzJobService.java \
  orci/src/test/java/com/guided/orci/quartz/JobCleanerJobIntegrationTest.java \
  orci/src/test/java/com/guided/orci/service/quartz/QuartzJobServiceTest.java
export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home
mvn -pl orci -am test -Dtest='QuartzJobServiceTest,JobCleanerJobIntegrationTest' -Dsurefire.failIfNoSpecifiedTests=false
```
(`-q` hides surefire counts; read `orci/target/surefire-reports/*.txt`. Integration test needs Docker.)

**How it fits OR-2947.** OR-2947 asks for tenant-qualified Quartz keys (`<tenant>:<group>` factory, reject
cross-tenant delete/exists, tenant-scoped admin listing, legacy key migration). The metadata-driven cleaner
satisfies its "cleaner" bullet without key prefixes and is independent of the rest; land it first or as its own
commit. Whether OR-2947's wider key work ships in the same PR is Ryan's call.

**Close-out checklist for the PR that carries the cleaner change**
1. PR body: `Fixes OR-2947` plus `Fixes OR-2928`, `OR-2934`, `OR-2883`, `OR-2916`, `OR-2923`.
2. The five tickets each carry a comment pointing at closed PR #4606 saying "parked under OR-2947"; edit or
   add a one-liner with the real PR link (comment ids 37612, 37613, 37614, 37615, 37616 on 2928/2934/2883/2916/2923).
3. After merge and a dev deploy, the N+1 disappears; then **archive** the five Sentry issues (resolve alone
   lets Sentry reopen the tickets on regression). Links are in each ticket description.
4. Leftovers: remote branches `origin/bugfix/OR-2928-job-cleaner-demo-qa` (PR #4606 closed) and
   `origin/bugfix/OR-2947-metadata-driven-cleaner` hold the parked commit; delete both with `git push origin
   --delete <branch>` once the cleaner change merges. The 2928 worktree and local branches are already gone.

**Gotchas learned.** Sentry links only open in Chrome when Ryan is signed in; the tab title shows the issue
type at once. Local Sentry credentials, CloudWatch/ECS reads and dev RDS without VPN are blocked.
`findIncompleteJobMetadata` in JobMetadataRepository is dead code (delete it in the same PR if touching the file).
See [[sentry-events-have-no-release]], [[jira-watch-validation-loop]].
