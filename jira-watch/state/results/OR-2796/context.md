# OR-2796 — IllegalArgumentException: Invalid range: (2026-08-15T18:39:28.876Z..2026-08-15T18:28:00.001Z)

Status: Testing   Assignee: Ryan Ducharme

## Description

Sentry Issue: [ORCI-MONOLITH-GM|https://guided-clinical-solutions.sentry.io/issues/7674017066/?referrer=jira_integration]

{code}
IllegalArgumentException: Invalid range: (2026-08-15T18:39:28.876Z..2026-08-15T18:28:00.001Z)
    at com.guided.orci.models.medication.IInfusionMedicationAdministration.hasCalculatedActivityBetween(IInfusionMedicationAdministration.java:156)
    at com.guided.orci.models.medication.IInfusionMedicationAdministration.isAdministeredBetween(IInfusionMedicationAdministration.java:127)
    at com.guided.orci.service.medication.MedicationService.lambda$getAdministrationsByMedicationCategoryInDateRange$5(MedicationService.java:192)
    at com.guided.orci.service.medication.MedicationService.getAdministrationsByMedicationCategoryInDateRange(MedicationService.java:193)
    at com.guided.orci.service.medication.MedicationService$$SpringCGLIB$$0.getAdministrationsByMedicationCategoryInDateRange(<generated>)
...
(76 additional frame(s) were not displayed)

Unable to evaluate compliance for rule fired result: 01a006b8-c914-73d0-a2f7-9f1d7f51b010 on operation: [redacted]
{code}

## Comments (0)

(none)
