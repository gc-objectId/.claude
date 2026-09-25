# OR-2886 — NullPointerException: Cannot invoke "Object.getClass()" because "date" is null

Status: Testing   Assignee: Ryan Ducharme

## Description

Sentry Issue: [ORCI-MONOLITH-HM|https://guided-clinical-solutions.sentry.io/issues/7719921028/?referrer=jira_integration]

{code}
NullPointerException: Cannot invoke "Object.getClass()" because "date" is null
    at com.guided.orci.dto.rule.context.ContextPatient.lambda$getMostRecentIntraopMedicationAdministration$3(ContextPatient.java:197)
    at com.guided.orci.dto.rule.context.ContextPatient.getMostRecentIntraopMedicationAdministration(ContextPatient.java:198)
    at com.guided.orci.engine.rule.medication.selection.TOFSugammadexAdjustmentWarningRule.evaluate(TOFSugammadexAdjustmentWarningRule.java:107)
    at com.guided.orci.engine.rule.medication.selection.TOFSugammadexAdjustmentWarningRule.evaluate(TOFSugammadexAdjustmentWarningRule.java:42)
    at com.guided.orci.engine.rule.Rule.apply(Rule.java:31)
...
(57 additional frame(s) were not displayed)

Error processing rule: w-sugammadex-default-dose
{code}

## Comments (0)

(none)
