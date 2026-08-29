# Coverage from OR-2709 — 3 open proposal(s)

## Proposals still open

```
OR-2709#0
  qa-suite supplemental clinical-rules scenario: Mayo case carrying exactly p-pancreatectomy + p-biliary-stent-placement shows Piperacillin-Tazobactam as the recommended antibiotic, and the same case plus a third procedure does not.

OR-2709#1
  Integration test that KnownProcedureNoAntibioticRule and KnownProcedureAntibioticNotRecommendedRule fire against the combination regimen - giving Cefazolin on a pancreatectomy-with-stent case should alert, giving Piperacillin-Tazobactam should not.

OR-2709#2
  Service test pinning combination behaviour against a case that carries an acuity (urgent/emergent), asserting the combination pathway still applies and the members' acuity-scoped configuration does not resurface.
```

## The validation that produced them

```
=== OR-2709 ===

disposition : admitted_with_caveats
detail      : verdict=deploy-ready; posted and transitioned; caveats:
  - Resolution was exercised through GET /api/admin/patients/{pmrn}/operations/{caseId}/antibiotic-candidates, which calls the same ProcedureAntibioticCandidateService.resolve the rule engine calls; the Mayo app-launch UI is unreachable locally because it requires Epic OAuth.
  - Cases were staged with POST /api/admin/patients/{uuid}/operations/create rather than a real Mayo SIU/Epic case start, so procedure-set derivation from the HL7 feed was not exercised.
  - Alert firing itself (KnownProcedureNoAntibioticRule / KnownProcedureAntibioticNotRecommendedRule) was not driven end-to-end on a combination case; only the resolution the rules read was observed, confirmed present in the MedicationSelectionContext debug dump.
  - The demo-demo org negative returned an empty list because demo has no configured pathways for those two procedures, so the direct observation there is the absent combination log line rather than a differing non-empty regimen.
  - The pre-fix class swap disabled only the combination hook inside the HEAD class rather than restoring the parent commit's file verbatim, because post-merge DTO renames make the parent source uncompilable against the shipped classpath.
  - Acuity was never set on any case (classification null throughout), so the interaction between a combination pathway and acuity-scoped configuration was not exercised at runtime.
ran at      : 2026-08-24T21:28:52Z
verdict     : deploy-ready
built from  : e7eeafd6c15f63ec57599b0bd15c93e781c5bb74

caveats:
  - Resolution was exercised through GET /api/admin/patients/{pmrn}/operations/{caseId}/antibiotic-candidates, which calls the same ProcedureAntibioticCandidateService.resolve the rule engine calls; the Mayo app-launch UI is unreachable locally because it requires Epic OAuth.
  - Cases were staged with POST /api/admin/patients/{uuid}/operations/create rather than a real Mayo SIU/Epic case start, so procedure-set derivation from the HL7 feed was not exercised.
  - Alert firing itself (KnownProcedureNoAntibioticRule / KnownProcedureAntibioticNotRecommendedRule) was not driven end-to-end on a combination case; only the resolution the rules read was observed, confirmed present in the MedicationSelectionContext debug dump.
  - The demo-demo org negative returned an empty list because demo has no configured pathways for those two procedures, so the direct observation there is the absent combination log line rather than a differing non-empty regimen.
  - The pre-fix class swap disabled only the combination hook inside the HEAD class rather than restoring the parent commit's file verbatim, because post-merge DTO renames make the parent source uncompilable against the shipped classpath.
  - Acuity was never set on any case (classification null throughout), so the interaction between a combination pathway and acuity-scoped configuration was not exercised at runtime.

evidence.positive:
  Against the running instance at localhost:62666 (image guidedclinical/orci:loop-e7eeafd6c), a mayo-mayo patient (pmrn or2709-fake-de45cf6a-d057-4134-a6af-712d3ce69825) was created and given a case carrying exactly p-pancreatectomy + p-biliary-stent-placement (caseId 26669, operation 01a035b0-80b3-7775-b1e1-9a4bc720f401). GET /api/admin/patients/{pmrn}/operations/26669/antibiotic-candidates returne

evidence.negative:
  Four non-combination cases on the same Mayo patient were resolved through the same endpoint and none received PIPERACILLIN_TAZOBACTAM: p-pancreatectomy alone (caseId 56743) -> ["step 1: CEFAZOLIN and METRONIDAZOLE"]; p-biliary-stent-placement alone (caseId 15237) -> ["step 1: CEFAZOLIN"]; the same two procedures plus a third, p-cholecystectomy (caseId 80530) -> ["step 1: CEFAZOLIN and METRONIDAZOL

evidence.red_check:
  Two independent flips. (1) Pre-fix behaviour swap: the shipped ProcedureAntibioticCandidateService source was copied, @Slf4j replaced with an explicit org.slf4j logger (lombok is not on the runtime classpath), and the single OR-2709 hook line 'List<AntibioticPathway> combination = procedureCombinationPathwayService.pathwaysFor(operation);' replaced with 'List.of()' plus a marker log. The parent-co

files: /Users/ryanducharme/.claude/jira-watch/state/results/OR-2709
```

## Grouping

```
  loopcmd cover OR-2709 OR-2776
      2 shared test files, e.g. orci/src/test/java/com/guided/orci/services/ProcedureCombinationPathwayServiceTest.java
```
