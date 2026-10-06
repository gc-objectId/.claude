# OR-2944 — Consolidate the procedure-start antibiotic rules into a-incomplete-antibiotic-pathway

Status: Testing   Assignee: Ryan Ducharme

## Description

{{a-known-procedure-no-antibiotic}} and {{a-known-procedure-missing-antibiotic}} answer one question at PROCEDURE_START: was every drug of at least one recommended option given? They are two rules only because they were delivered as two tickets (OR-772, OR-773). Their copies of the shared logic have started to drift, and OR-2935 / OR-2936 would change both copies again.

Merge them into one rule, {{a-incomplete-antibiotic-pathway}}. Clinicians must see no change: the same alerts, with the same text, fire in the same cases. The only intended behavior change is the shared lockout (see below).

h2. Evaluation

The merged rule chooses a branch from one fact: was any antibiotic given (ANTIBIOTIC category, recognized route, inside that drug's lookback)? This is exactly the check that separates the two rules today.

||Any antibiotic given?||Branch||Logic||
|No|NONE_GIVEN|Today's {{a-known-procedure-no-antibiotic}}, unchanged: the same abstains in the same order (no procedure, no preferred options, OPTIONAL_PROPHYLAXIS), the same prompt, rejection reasons, and details keys.|
|Yes|PARTIALLY_GIVEN|Today's {{a-known-procedure-missing-antibiotic}}, unchanged: the same abstains in the same order (no preferred options, no candidate antibiotic given, an option complete, unqualified procedure, nothing part-way given), the same prompt, rejection reasons, and details keys.|

* Keep every abstain reason string verbatim.
* Keep each branch's acuity-label condition as it is today. The two conditions differ. Making them the same is a behavior change and is not part of this ticket.
* Add {{PATHWAY_STATUS}} = {{NONE_GIVEN}} or {{PARTIALLY_GIVEN}} to the details map, so analytics can separate the branches under one rule ID.
* Keep type ALERT, trigger NOTIFICATION, event PROCEDURE_START, and guidance category DELAYED_MISSED_OR_WRONG_ANTIBIOTIC.

h2. Lockout (the one behavior change)

The lockout is keyed by rule ID, so the merged rule has one lockout for each operation. Today each rule has its own lockout. The difference: nothing is given at the first PROCEDURE_START (no-antibiotic fires), and later a partial dose is given before a second PROCEDURE_START (missing-antibiotic fires too). After the merge, the second alert does not fire. In the MGH prod snapshot, this happened in 14 of about 1,930 operations. This is accepted.

h2. Tests: port all of them, no regression

* Port every test method from {{KnownProcedureNoAntibioticRuleTest}} and {{StartProcedureMissingAntibioticRuleTest}}, including the {{@Nested}} classes, into one test class for the new rule. Keep each test's name, setup, and assertions. Change only the class under test and the rule references.
* Seven ported tests are the exception. Each old test class checks one rule alone, and in these tests the old rule abstains because the case belongs to the other rule. On the merged rule, the other branch runs. The alerts a clinician sees do not change.
* No-antibiotic {{testAntibioticsWereGivenInvalidates}} and {{testLookbackBoundaryDoseIsIncluded}}: an antibiotic counted, so the case goes to PARTIALLY_GIVEN. New expectation: abstain "No procedure candidates: case antibiotic guidance not resolved".
* Missing-antibiotic {{testNoProcedureCandidatesAbstains}}, {{testUnresolvedGuidanceAbstains}}, and {{testAnUnmappedProcedureAbstains}}: nothing was given, so the case now goes to NONE_GIVEN. Add a non-candidate antibiotic ({{OTHER}}) to the setup so the test stays in PARTIALLY_GIVEN. The assertion stays the same.
* Missing-antibiotic {{testNoAntibioticsAdministered}} and {{testLookbackBoundaryDoseIsExcluded}}: nothing counted, so the merged rule fires NONE_GIVEN, as a-known-procedure-no-antibiotic does today. New expectation: fires with {{PATHWAY_STATUS = NONE_GIVEN}}.
* Every other ported test passes with no change. If one fails, the merge is wrong. Do not delete, merge, or weaken a test to make it pass.
* Add tests for the branch choice: nothing given leads to the NONE_GIVEN logic, and any antibiotic given leads to the PARTIALLY_GIVEN logic.
* Add a test that pins the shared lockout: after NONE_GIVEN fires, a later PROCEDURE_START with a partial dose abstains.
* Add tests that {{PATHWAY_STATUS}} is set on each branch.
* QA suite: {{qa-suite/clinical-rules/procedure-antibiotics.spec.ts}} and {{.md}} refer to the new rule ID.

h2. Retire the old rules

* Delete {{KnownProcedureNoAntibioticRule}}, {{StartProcedureMissingAntibioticRule}}, and their tests.
* {{spec/rules/}}: delete both old spec files, and add {{a-incomplete-antibiotic-pathway.md}} (both specs merged, plus the lockout change in History). The build fails if the spec files do not match the rule IDs.
* {{citations.csv}} (demo, MGB, Mayo): the {{r-antibiotic-start-case-procedure}} row names the new rule ID.
* Analytics: {{mayo-mayo/metrics/no_antibiotic_alert_detail.sql}} reads the old ID, or the new ID with {{PATHWAY_STATUS = NONE_GIVEN}}. Add the new ID to the ID lists in {{mgb-mgh/research/antibiotic_antiemetic_rule_analysis.sql}}. Update the row in the {{orci/src/main/analytics/CLAUDE.md}} table.
* Do not rewrite history. Earlier firings keep their old IDs, and migration 226 stays as it is.
* Do not migrate {{rule_definitions}}. Startup syncs it again.

h2. Before deploy

The new rule gets a new feature flag, {{RULE:a-incomplete-antibiotic-pathway}}, which is enabled for all tenants. In the AWS prod snapshot, both old flags are enabled with no disabled tenants, and neither ID has rows in {{rule_configurations}} or {{operation_rule_settings}}. So the new flag is equivalent there. Check the same thing in MGB OpenShift prod and in Mayo prod. If an environment disables either old rule for a tenant, stop and decide before deploy.

Check the Metabase cards and the hand-applied prod views that filter on the old rule IDs, and add the new ID to them.

h2. Out of scope

* Making the two acuity-label conditions the same, the off-pathway antibiotic gap, and removing the dead qualifier code. Each one is a behavior change or a cleanup ticket.
* OR-2935 and OR-2936 (stale pre-op doses) wait for this ticket, and are then re-scoped to the single rule.

h2. Acceptance criteria

* One rule, {{a-incomplete-antibiotic-pathway}}, replaces both old rules. The old classes, tests, and specs are gone.
* Every test from both old test classes is ported and passes. Only the seven tests listed above have a changed setup or expectation.
* The new tests for the branch choice, the shared lockout, and {{PATHWAY_STATUS}} pass.
* Prompt text, titles, buttons, rejection reasons, and abstain reasons are the same as today for each branch.
* The citation, analytics SQL, QA suite, and spec use the new ID.
* The pre-deploy flag and config check is done for MGB and Mayo prod.

## Comments (2)

### Jordan Ephron — 2026-09-30T15:51:01

Wait what’s the relationship between this one and [https://guidedclinical.atlassian.net/browse/OR-2948|https://guidedclinical.atlassian.net/browse/OR-2948|smart-link], which also wants to introduce a-incomplete-antibiotic-pathway 
Did we just break it up into (stage 1: refactor to consolidate; stage 2: change behavior)?

### Theodore Nguyen-Cao — 2026-09-30T16:08:27

[~accountid:640bbd89896d10ebd4754d07] correct. This consolidates and [https://guidedclinical.atlassian.net/browse/OR-2948|https://guidedclinical.atlassian.net/browse/OR-2948|smart-link]  adds new early dose logic. And [https://guidedclinical.atlassian.net/browse/OR-2933|https://guidedclinical.atlassian.net/browse/OR-2933|smart-link]  layers in vanco as a candidate

