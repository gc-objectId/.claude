# OR-3027 — Compliance lookup with a null tracking id scans all rule firings

Status: Testing   Assignee: Ryan Ducharme

## Description

RuleComplianceService.evaluateComplianceOnMedicationAdministration passes medAdmin.getTrackingId() to RuleFiredResultRepository.findAllByRuleExecutionContext_TrackingId without a null check. An HL7 administration has no tracking id when evaluateEmrAdministration returns early (no operation, pre-change patient, administration date or medication), and the after-commit hook in DefaultHL7ProcessingContext still runs the compliance lookup.

Spring Data turns the null argument into tracking_id IS NULL. AbstractRuleResult.ruleExecutionContext is an optional @ManyToOne, so the derived query uses a LEFT JOIN. With a left join, IS NULL also matches firings without a context, so Postgres cannot use rule_execution_contexts_tracking_id_idx: it reads all of rule_fired_results and rule_execution_contexts on every call and returns no rows.

Effect in prod: this statement is 52-59% of Aurora DB load in business hours and grows with both tables. It drives the guidedor-prod-aurora-acu-ceiling alarm, which flaps many times a day as the cluster approaches its 4 ACU cap.

Fix: return early when the administration has no tracking id, since no rules ran and no firings can belong to it. Map ruleExecutionContext as optional = false to match the NOT NULL column, so derived queries through it use an inner join.

## Comments (0)

(none)
