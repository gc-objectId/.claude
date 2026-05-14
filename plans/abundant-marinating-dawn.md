# OR-2396: Patient Delete Cascade + Test Data Cleanup

## Context

The demo-demo schema has 204 test-created patients from QA suite runs that never clean up. Tests use PMRN format `{prefix}-fake-{uuid}`. The patient list endpoint only returns 50, so real demo patients get buried. We need: per-patient delete endpoints (full JPA cascade) + QA suite teardown logic.

## Backend: Delete Cascade

### Approach
Add `@Modifying @Query` bulk delete methods to ~20 repositories (faster than derived `deleteBy*` which loads entities first). Orchestrate in a `PatientDeletionService` with proper ordering to avoid FK violations.

### Deletion order (deepest-first)

**Phase 1: Rule engine results**
1. `ComplianceResultRepository` — delete by patient (join through ruleFiredResult → ruleExecutionContext)
2. `RuleFiredResultRepository` — delete by patient (join through ruleExecutionContext)
3. `RuleNotFiredResultRepository` — same
4. `RuleFailureResultRepository` — same
5. `RuleExecutionContextRepository` — delete by patient

**Phase 2: Operation-linked entities (for all patient's operations)**
6. `HL7MessageRepository` — null out operation + medicationAdministration FKs (nullable)
7. `UserMedicationSelectionTabRepository` — delete by patient (join through medicationSelection)
8. `MedicationSelectionRepository` — delete by patient
9. `WindowTrackingEventRepository` — delete by operation
10. `InteractiveCaseLaunchEventRepository` — delete by operation
11. `UserCaseActivitySpanRepository` — delete by operation
12. `TrackingEventRepository` — delete by patient
13. `OperationEventRepository` — delete by operation
14. `OperationSessionRepository` — delete by operation
15. `UserOperationSettingsRepository` — delete by operation
16. `OperationRuleSettingsRepository` — delete by operation
17. `FeedbackSubmissionRepository` — delete by operation

**Phase 3: Quartz + integration**
18. Cancel Quartz jobs per operation via `QuartzJobService.deleteAllJobs(caseId)`
19. `JobMetadataRepository` — delete by patient
20. `ClientIdMappingEventRepository` — delete by patient (nullable FK)
21. `MGBEventNotificationRepository` — delete by patient (nullable FK)

**Phase 4: Direct patient children not covered by cascade**
22. `TrackedValueRepository` — delete by patient
23. `PatientSnapshotRepository` — delete by patient
24. `BloodPressureRepository` — delete by patient
25. `OperationRepository` — delete by patient (OperationProcedureType cascades automatically)

**Phase 5: Patient itself**
26. `PatientRepository.delete(patient)` — cascades to: encounters, medicationOrders, medicationAdministrations, medicationNotes, patientConditions, familyMemberHistories, medicationAllergies, allergies, observations

**Phase 6: Cache**
27. `PatientCacheService.clearCache(patientId)`

### Repository methods to add (~20 repos)

Pattern for each:
```java
@Modifying
@Query("DELETE FROM EntityName e WHERE e.patient = :patient")
void deleteByPatient(@Param("patient") Patient patient);
```

For operation-linked entities that don't have a direct patient FK:
```java
@Modifying
@Query("DELETE FROM EntityName e WHERE e.operation IN :operations")
void deleteByOperationIn(@Param("operations") List<Operation> operations);
```

For deep joins (compliance results, rule results):
```java
@Modifying
@Query("DELETE FROM ComplianceResult cr WHERE cr.ruleFiredResult IN (SELECT rfr FROM RuleFiredResult rfr WHERE rfr.ruleExecutionContext IN (SELECT rec FROM RuleExecutionContext rec WHERE rec.patient = :patient))")
void deleteByPatient(@Param("patient") Patient patient);
```

### New files
- `PatientDeletionService.java` — orchestrates the cascade, single `@Transactional` method

### Endpoints

```
DELETE /api/admin/patients/by-pmrn/{pmrn}     → delete single patient
DELETE /api/admin/patients/test-cleanup        → bulk delete all -fake- patients
```

### Safeguards
- Refuse to delete PMRNs matching `patient-\d+` (demo patients)
- `test-cleanup` only matches `-fake-` pattern
- `test-cleanup` accepts `?dryRun=true` (default) — returns count without deleting
- Both endpoints require ROLE_ADMIN (already enforced by `/api/admin/**` security config)

## QA Suite: Teardown

### Approach: Global teardown only
- Create `qa-suite/global-teardown.ts`
- Register in `playwright.config.ts` as `globalTeardown`
- Calls `DELETE /api/admin/patients/test-cleanup?dryRun=false` after the suite finishes
- Logs count of deleted patients

### Fixture additions (`patient-api.ts`)
- `deletePatient(request, baseURL, pmrn)` — for ad-hoc use
- `deleteTestPatients(request, baseURL)` — calls bulk cleanup

## Files to modify

| File | Change |
|------|--------|
| ~20 repositories in `orci-repositories/` | Add `@Modifying @Query` delete methods |
| `orci/src/.../service/PatientDeletionService.java` (new) | Orchestrates cascade |
| `orci/src/.../web/admin/PatientController.java` | Add 2 delete endpoints |
| `qa-suite/global-teardown.ts` (new) | Global teardown script |
| `qa-suite/playwright.config.ts` | Register globalTeardown |
| `qa-suite/fixtures/patient-api.ts` | Add delete fixture functions |

## Verification

1. `mvn clean compile -DskipTests` — backend compiles
2. Start locally, create a test patient via the app, then delete via `DELETE /api/admin/patients/by-pmrn/{pmrn}?client_id=demo-demo`
3. Verify FK violations don't occur — check logs
4. Run `TEST_ENV=local npm run smoke` — smoke tests pass
5. Run `TEST_ENV=local npm run cv:core` — CV tests pass AND global teardown fires, cleaning up test patients
6. Query `SELECT count(*) FROM "demo-demo".patients WHERE pmrn LIKE '%-fake-%'` — should be 0 after suite completes
