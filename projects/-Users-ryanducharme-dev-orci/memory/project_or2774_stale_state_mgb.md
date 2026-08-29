---
name: project-or2774-stale-state-mgb
description: OR-2774 reopened by an MGB-only event; the ticket title names the wrong entity and the wrong entry path
metadata:
  type: project
---

OR-2774 (`ObjectOptimisticLockingFailureException` on concurrent patient refresh) was fixed by
PR #4358 (merged 2026-08-13, `PatientRefreshLock` = `pg_advisory_xact_lock` on (tenant, pmrn), taken
as the first DB action of the refresh transaction). Ryan validated it deploy-ready 2026-08-26;
Sentry reopened it 2026-08-27.

The reopening events are **MGB-only** (`tenant: mgb-mgh`, `environment: guidedor.partners.org`) and
do not match the ticket text: the entity is `PatientCondition`/`patient_conditions`, not
`FamilyMemberHistory`, and the entry path is `MGBNotificationController.notify` →
`MGBNotificationService.handleTimingEvent`, not the interactive app launch. Sentry kept the original
Aug-12 title while the fingerprint collected MGB events.

Whether MGB runs the fix is **unresolved** — its deployed image was never read. See
[[reference-sentry-events-have-no-release]] for why the build could not be dated from the event.

On current main the lock *is* the first DB action on all three refresh entry points
(`AppLaunchController`, the MGB/HL7 timing-event route, `DefaultHL7ProcessingContext.findOrCreatePatient`) —
none of the enclosing controller/service layers are `@Transactional`, so the precondition holds.

`AutoReleaseSemaphore` is a **counting** semaphore: exclusion comes from the permit count (1 for
`caseStartSemaphore`), and the string key only indexes the auto-release timer, so including
`threadId` is correct, not a bug. Its real defect — the permit is returned unconditionally after 30s
while the case start is still running, admitting the concurrency it exists to prevent — is OR-2857.
