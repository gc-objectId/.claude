# OR-2774 — ObjectOptimisticLockingFailureException: Batch update returned unexpected row count from update 0 (expected row count 1 but was 0) [delete from family_member_histories where id=?] for entity [com.guided.orci.models.patient.FamilyMemberHistory with id '019

Status: Testing   Assignee: Ryan Ducharme

## Description

Sentry Issue: [ORCI-MONOLITH-GJ|https://guided-clinical-solutions.sentry.io/issues/7667850752/?referrer=jira_integration]

{code}
StaleStateException: Batch update returned unexpected row count from update 0 (expected row count 1 but was 0) [delete from family_member_histories where id=?]
    at com.guided.orci.repository.OperationRepository.findByCaseIdAndPatientId(OperationRepository.java:55)
    at com.guided.orci.service.OperationService.startOperation(OperationService.java:140)
    at com.guided.orci.service.OperationService$$SpringCGLIB$$0.startOperation(<generated>)
    at com.guided.orci.service.AppLaunchService.getOrCreatePatientAndOperation(AppLaunchService.java:78)
    at com.guided.orci.service.AppLaunchService$$SpringCGLIB$$0.getOrCreatePatientAndOperation(<generated>)
...
(95 additional frame(s) were not displayed)

StaleObjectStateException: Batch update returned unexpected row count from update 0 (expected row count 1 but was 0) [delete from family_member_histories where id=?] for entity [com.guided.orci.models.patient.FamilyMemberHistory with id '019fe5cc-2cc8-7184-b0fa-7a3b8695c241']
    at com.guided.orci.repository.OperationRepository.findByCaseIdAndPatientId(OperationRepository.java:55)
    at com.guided.orci.service.OperationService.startOperation(OperationService.java:140)
    at com.guided.orci.service.OperationService$$SpringCGLIB$$0.startOperation(<generated>)
    at com.guided.orci.service.AppLaunchService.getOrCreatePatientAndOperation(AppLaunchService.java:78)
    at com.guided.orci.service.AppLaunchService$$SpringCGLIB$$0.getOrCreatePatientAndOperation(<generated>)
...
(95 additional frame(s) were not displayed)

ObjectOptimisticLockingFailureException: Batch update returned unexpected row count from update 0 (expected row count 1 but was 0) [delete from family_member_histories where id=?] for entity [com.guided.orci.models.patient.FamilyMemberHistory with id '019fe5cc-2cc8-7184-b0fa-7a3b8695c241']
    at com.guided.orci.repository.OperationRepository.findByCaseIdAndPatientId(OperationRepository.java:55)
    at com.guided.orci.service.OperationService.startOperation(OperationService.java:140)
    at com.guided.orci.service.OperationService$$SpringCGLIB$$0.startOperation(<generated>)
    at com.guided.orci.service.AppLaunchService.getOrCreatePatientAndOperation(AppLaunchService.java:78)
    at com.guided.orci.service.AppLaunchService$$SpringCGLIB$$0.getOrCreatePatientAndOperation(<generated>)
...
(78 additional frame(s) were not displayed)

Case start failed for case CaseId[value=1524386617], recording timing events before failing the event
{code}

## Comments (0)

(none)
