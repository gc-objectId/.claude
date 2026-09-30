# OR-2959 — Remove ComplianceResultRunner and its backfill paths

Status: Testing   Assignee: Ryan Ducharme

## Description

ComplianceResultRunner was a one-off migration that backfilled compliance results at startup. It is gated by compliance.results.process.enabled, which no profile and no AWS task definition sets; the task definitions only carry -Dcompliance.results.process.missing-only=true, which is inert on its own. The live compliance path (RuleComplianceService.evaluateCompliance, per administration and at case stop) is separate and stays.

Delete: orci/src/main/java/com/guided/orci/spring/ComplianceResultRunner.java, StartupPhase.COMPLIANCE_RESULT_EVAL, RuleComplianceService.processComplianceResults, RuleFiredResultRepository.streamAll and streamAllWithoutComplianceResult, the parameterized backlog test in RuleComplianceServiceGuardTest, the paragraph in the EventService case-stop comment that refers to the runner, and the missing-only JVM flag from the dev, stage, and prod task definitions. Confirm the MGB OpenShift deployment does not set the enabled flag before merging.

## Comments (0)

(none)
