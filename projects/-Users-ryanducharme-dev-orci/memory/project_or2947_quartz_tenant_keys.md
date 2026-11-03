---
name: or2947-quartz-tenant-keys
description: OR-2947 tenant-qualified Quartz keys — draft PR #4809 opened 2026-11-03 (two commits: cleaner, then keys) with the five OR-2928 cleaner tickets linked; design decisions, test commands, and the after-merge close-out
metadata:
  type: project
---

# OR-2947 — tenant-qualified Quartz job keys (draft PR #4809 opened 2026-11-03, two commits, worktree `~/dev/worktrees/OR-2947-quartz-jobs-keys`, branch `bugfix/OR-2947-quartz-jobs-keys`)

**Shape of the fix.** `TenantJobKeys` (orci-models, next to `JobMetadata`) is the one factory: group = `<tenant>:<group>`,
`tenantOf`/`bareGroup`/`isQualified` parse it back. `job_metadata.job_group` stays the bare group; only Quartz sees the
prefix, so every metadata lookup by key goes through `bareGroup`. `QuartzJobService.requireCurrentTenant` throws
`IllegalArgumentException` for any key (delete/exists/check/schedule/reschedule/trigger/wasScheduled) whose tenant is
not `TenantContextHolder.getTenant()` — a legacy unprefixed key is rejected too. The cleaner setup runner therefore
wraps each tenant in `withTenant`; cleaner jobs are `job-cleaner-<tenant>` in `<tenant>:job-cleaner`.
`LegacyJobKeyMigrationRunner` (phase -11, before the cleaner at -10, inside the init lock) moves unprefixed jobs of
enabled tenants (by JobDataMap `TENANT_ID`): add under the new key with triggers restarted at their next fire time,
then delete the old one; disabled/unknown tenants' jobs are left. The ticket's TODO says delete that runner once no
unprefixed group remains. The OR-2928 metadata-driven cleaner (704c7a8a4, Java files only) is folded in;
`CREATED_TIMESTAMP` trigger data is gone with it.

**Why not qualify by name.** The Sentry tickets and logs key on `group.name`; the ticket asked for a group prefix;
`GroupMatcher.groupStartsWith("<tenant>:")` gives the admin summary tenant scoping for free.

**Test gotcha.** Any integration test that reads triggers back from the Quartz store needs the
`quartzStoresRealJobs` `@DynamicPropertySource` (PostgreSQLDelegate, useProperties=false) — the shared test context's
StdJDBCDelegate fails with "Cannot convert the column of type BYTEA to requested type long". The old cleaner test's
override was about that, not about Long job data.

**Build/test commands that work in this worktree** (the audio plugin module must be excluded from the reactor or
`-am` fails on a missing plugin descriptor):
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home
mvn -o -pl 'orci,orci-models,!medication-audio-generator-plugin' -am test \
  -Dtest='TenantJobKeysTest,QuartzJobServiceTest,LegacyJobKeyMigrationRunnerTest,JobCleanerSetupRunnerTest,QuartzControllerTest,ScheduledRuleEngineTest,JobCleanerJobIntegrationTest,LegacyJobKeyMigrationIntegrationTest,DefaultHL7ProcessingContextMedAdminDispatchIntegrationTest' \
  -Dsurefire.failIfNoSpecifiedTests=false
```

**Existing tests that changed (expected keys, not loosened):** ScheduledRuleEngineTest (5 key sites → qualified),
JobCleanerSetupRunnerTest (rewritten for qualified keys + legacy-cleaner removal), JobCleanerJobIntegrationTest
(parked rewrite, qualified), DefaultHL7ProcessingContextMedAdminDispatchIntegrationTest (its Quartz probe reads the
qualified group).

**Done 2026-11-03:** PR body carries `Fixes` for OR-2947 and the five cleaner tickets; each of the six has a Jira
comment linking #4809. Theo wrote OR-2947 himself, so the key work is his spec; the cleaner rework replaces his
`isOwnedBy` from #4592 and the PR body says why (prefix filtering alone keeps the per-trigger N+1).

**After merge:** `worktree-done` here; move OR-2947 to Done (IMPLEMENT) once acceptance criteria are re-read; after
a dev deploy archive (not resolve) the five Sentry issues; delete `~/dev/worktrees/OR-2928-job-cleaner-demo-qa`
(`git branch -D`, worktree-done will refuse it) and `origin/bugfix/OR-2947-metadata-driven-cleaner`. A vim swap
file `.JobMetadata.java.swp` was sitting in orci-models/.../job during this session — Ryan had the file open.
