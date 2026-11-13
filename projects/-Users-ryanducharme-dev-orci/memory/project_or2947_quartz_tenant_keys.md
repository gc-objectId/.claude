---
name: or2947-quartz-tenant-keys
description: OR-2947 tenant-qualified Quartz keys — PR #4809 in review; 2026-11-10 the OR-2928 cleaner rewrite was pulled back out at Theo's request (old trigger-scan cleaner kept, scoped by prefix); design decisions, test commands, and the after-merge close-out
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

**Theo's review (2026-11-03):** QuartzJobService must not *require* a tenant — platform-wide jobs may exist one day.
Round two (pushed 2026-11-05 as bd4ae303f; round three force-pushed 2026-11-06 as c5e90cd7e (history rewrite dropped a committed .swp file; *.swp now in root .gitignore): migration moves any job naming a tenant, admin filters on JobDataMap TENANT_ID; PR #4809 ready for review): `TenantJobKeys.belongsTo(key, tenant)` is the rule — a key
naming a tenant must match the context, a key with no prefix is platform-wide and passes anywhere; metadata lookups
skip platform keys; `TriggerLifecycleListener.triggerFired` clears the context when `TENANT_ID` is absent instead of
throwing; admin summary/current-jobs include platform jobs. Tech-debt ticket still to draft: `TimerBasedRuleEngine`
stores a trigger name that differs from the real trigger (metadata never marked complete; cleaner closes it as an
orphan) and builds the job name from `PatientId.toString()`.

**Done 2026-11-03:** PR body carries `Fixes` for OR-2947 and the five cleaner tickets; each of the six has a Jira
comment linking #4809. Theo wrote OR-2947 himself, so the key work is his spec; the cleaner rework replaces his
`isOwnedBy` from #4592 and the PR body says why (prefix filtering alone keeps the per-trigger N+1).

**Cleaner pulled back out (2026-11-10, commit 3beab8dd6, forward commit — dropping 67ca0e3e3 would have conflicted
with all three later commits).** Theo asked twice to keep the original cleaner and keep the PR to tenant keys. The
branch now carries main's trigger-scan cleaner, `getStaleJobKeys` scoped with
`GroupMatcher.triggerGroupStartsWith(TenantJobKeys.groupPrefix(tenant))` and `isOwnedBy` gone; `CREATED_TIMESTAMP`
and `markStaleJobMetadataAsComplete` (72h sweep) are back; `JobCleanerJob` skips its own group via `bareGroup`.
The metadata-driven cleaner lives in commit 67ca0e3e3 on this branch's history (and 704c7a8a4): resurrect it as its
own PR under OR-2928 **after** #4809 merges, with Theo's point folded in (a failed delete must still close the
metadata eventually; the old 72h sweep did). When reposting it, say "fewer per-row Quartz calls", never "N+1 gone":
`deleteJob` per stale row is still a round trip each. Pushed 2026-11-10; PR body now links only OR-2947, and the 2026-11-03
"fix is in #4809" comments on the five cleaner tickets (ids 37906–37910) were edited in place to say the cleaner
comes as its own PR under OR-2928.

**After merge:** `worktree-done` here; move OR-2947 to Done (IMPLEMENT) once acceptance criteria are re-read. The
OR-2928 close-out (archive the five Sentry issues after a dev deploy) moves to the cleaner PR; delete
`~/dev/worktrees/OR-2928-job-cleaner-demo-qa` (`git branch -D`, worktree-done will refuse it) and
`origin/bugfix/OR-2947-metadata-driven-cleaner` only once that PR is up. A vim swap
file `.JobMetadata.java.swp` was sitting in orci-models/.../job during this session — Ryan had the file open.

## Migration dropped (2026-11-12, commit e48575451, pushed 2026-11-12)
Theo asked whether `LegacyJobKeyMigrationRunner` was needed since old jobs complete on their own. Traced: reminders are
one-shot, timer jobs carry a 36h end date, glucose-check jobs repeat forever but main's cleaner (any-group scan +
`isOwnedBy` TENANT_ID check) kills them at 36h regardless of key shape. So the runner, its two tests, the
`MIGRATE_JOB_KEYS` phase, and the prefix-scoped scan were all removed; `getStaleJobKeys` is byte-identical to main
again. Never drop the runner while keeping a prefix-scoped scan: that combination leaks old-keyed glucose checks forever.
Admin listing still reads TENANT_ID for unprefixed jobs (they exist until they complete). PR body applied (no migration or cleaner bullet). Jira comment 37906 on OR-2928 now says #4809 leaves the cleaner scan as on main.

## Legacy-key fallback (2026-11-12, commit 1c7d8c6e6, pushed)
The bot flagged that without the migration, case stop could not cancel a reminder armed before the deploy (the
scheduled-rule job only checks the case exists, not that it ended), so a redose reminder would fire after case stop.
Fix: `deleteJob` and `jobExists` try the tenant key, then the bare key, taken only when that job's TENANT_ID is the
current tenant (reuses `isOwnedBy`). Reschedule paths now lazily migrate old jobs. Bot re-review on 1c7d8c6e6: no new
issues; its thread resolved. Theo's two threads left for him. **Follow-up owed:** tech-debt Task to remove the
fallback once every environment has had one deploy plus 36h.
