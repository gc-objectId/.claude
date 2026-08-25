# OR-2680 — NullPointerException: Cannot invoke "com.guided.orci.models.patient.Patient.getId()" because "patient" is null

Status: Testing   Assignee: Ryan Ducharme

## Description

Sentry Issue: [ORCI-MONOLITH-FG|https://guided-clinical-solutions.sentry.io/issues/7627684207/?referrer=jira_integration]

{code}
NullPointerException: Cannot invoke "com.guided.orci.models.patient.Patient.getId()" because "patient" is null
    at com.guided.orci.service.PatientService.getObservations(PatientService.java:196)
    at com.guided.orci.service.PatientService$$SpringCGLIB$$0.getObservations(<generated>)
    at com.guided.orci.web.admin.ObservationController.getObservations(ObservationController.java:124)
    at com.guided.orci.web.admin.ObservationController$$SpringCGLIB$$0.getObservations(<generated>)
    at com.guided.orci.web.filter.UserIdContextFilter.doFilterInternal(UserIdContextFilter.java:36)
...
(95 additional frame(s) were not displayed)
{code}

## Comments (0)

(none)
