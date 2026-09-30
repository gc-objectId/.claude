# OR-2931 — IncomparableException

Status: Testing   Assignee: Ryan Ducharme

## Description

*Sentry Issue:* [ORCI-MONOLITH-HY|https://guided-clinical-solutions.sentry.io/issues/7739327585/]

{code:java}
IncomparableException
    at com.guided.orci.types.Dose.lambda$static$0(Dose.java:57)
    at com.guided.orci.types.Dose.isGreaterThanOrEqualTo(Dose.java:202)
    at com.guided.orci.engine.rule.compliance.DefaultDoseComplianceEvaluator.isWithinWeightBasedRange(DefaultDoseComplianceEvaluator.java:64)
    at com.guided.orci.engine.rule.compliance.DefaultDoseComplianceEvaluator.isMedAdminCompliantWithDose(DefaultDoseComplianceEvaluator.java:50)
    at com.guided.orci.engine.rule.compliance.DefaultDoseComplianceEvaluator.evaluate(DefaultDoseComplianceEvaluator.java:109)
    at com.guided.orci.service.rules.compliance.RuleComplianceService.evaluateCompliance(RuleComplianceService.java:81)
    at com.guided.orci.service.rules.compliance.RuleComplianceService$$SpringCGLIB$$0.evaluateCompliance(<generated>)
    at com.guided.orci.service.rules.RuleExecutionResultService.save(RuleExecutionResultService.java:104)
    at com.guided.orci.service.rules.RuleExecutionResultService.save(RuleExecutionResultService.java:92)
    at com.guided.orci.service.rules.RuleExecutionResultService$$SpringCGLIB$$0.save(<generated>)
    at com.guided.orci.service.rules.medication.EMRAdministeredMedicationProcessor.evaluate(EMRAdministeredMedicationProcessor.java:193)
    at com.guided.orci.service.hl7.DefaultHL7ProcessingContext.evaluateEmrAdministration(DefaultHL7ProcessingContext.java:352)
    at com.guided.orci.service.hl7.DefaultHL7ProcessingContext.saveMedAdmin(DefaultHL7ProcessingContext.java:130)
    at com.guided.orci.service.hl7.DefaultHL7ProcessingContext$$SpringCGLIB$$0.saveMedAdmin(<generated>)
    at com.guided.orci.integration.mayo.hl7.MayoHL7RasMedAdminProcessor.process(MayoHL7RasMedAdminProcessor.java:319)
{code}

*Environment:* guidedor.guidedclinical.com (production)
*First seen:* 2026-09-18T02:33:02.143000Z  ·  *Occurrences:* 1

*Crash site:* {{orci-models/src/main/java/com/guided/orci/types/Dose.java:57}}
{code}
24c871f5d5  Jordan Ephron  2024-01-22
                        .formatted(o1.toString(), o2.toString()));
{code}

*Recent history:*
- 7d0db325a Skip the dose unit-parse warning when the unit is absent
- 1fec7f370 OR-2188 - update default dose compliance to better handle dose units
- 1af459323 OR-1996 - more rounding tweaks
- ef07a90b5 OR-1996 - more rounding tweaks
- 01d3137c9 OR-1996 - refactor rounding logic

*Related PR:* [OR-689 - Store max dose for AbstractWeightAdjustmentWarningRule|https://github.com/guidedclinical/orci/pull/1025]

## Comments (0)

(none)
