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

# Also in this group: OR-2776

## Proposals still open

```
OR-2776#0
  Parameterize allergyToTheFirstStepFallsToTheCombinationsFallback over shippedCombinations() so the whipple pair's step-2 LEVOFLOXACIN+METRONIDAZOLE+VANCOMYCIN fallback is pinned, not just the pancreatectomy pair's.

OR-2776#1
  Parameterize aFurtherProcedureFallsBackToThePerProcedureWalk over shippedCombinations() so the exact-set match is pinned for whipple + biliary stent + appendectomy (observed SUPPRESSED_DISAGREEMENT at runtime).

OR-2776#2
  Add a ProcedureBasedWrongAntibioticRule case driven by the shipped whipple + biliary-stent resolution rather than mocked candidates, asserting cefazolin fires the alert naming Piperacillin-Tazobactam and pip-tazo abstains.
```

## The validation that produced them

```
=== OR-2776 ===

disposition : admitted
detail      : verdict=deploy-ready; posted and transitioned; caveats recorded, none material
ran at      : 2026-08-26T18:49:19Z
verdict     : deploy-ready
built from  : 2cd9104ea3c7fa05ed45a99339f842b802ebb1cf

caveats:
  - The org component of the combination key was not exercised at runtime: neither demo-demo nor the mgb tenants seed p-whipple or p-biliary-stent-placement, so 'a non-Mayo tenant with the same pair gets nothing' rests on the unit test only.
  - Cases were built through the admin create-operation endpoint, so the Epic procedure-name mapping to p-whipple (7 NAME rows in mayo/procedures/procedure-codes.csv) was not exercised end to end from a feed.
  - The Mayo web UI was not driven directly (tenant login is Epic OAuth-gated); the user-facing behaviour was exercised through the tenant-facing /api/cds/medication-selection API as loopuser plus the admin antibiotic-candidates debugger.
  - Compiling the pre-fix class in place required substituting an explicit org.slf4j.Logger for @Slf4j because lombok is absent from the runtime classpath; nothing else in the pre-fix source was altered.

evidence.positive:
  Against the running app at localhost:55752 (image built from 2cd9104ea), created a mayo-mayo patient and case carrying exactly p-whipple + p-biliary-stent-placement via POST /api/admin/patients/ and .../operations/create (pmrn or2776-fake-7b1c5782-d29b-4497-b047-14054146ae43, caseId 98502). GET /api/admin/patients/{pmrn}/operations/98502/antibiotic-candidates returned outcome=RECOMMENDED with reco

evidence.negative:
  Built three further mayo-mayo cases and read the same debugger endpoint. p-whipple alone (case 95782): outcome=NOT_CONFIGURED, recommended=(none), log 'Operation ... has no antibiotic pathways to walk under tenant TenantKey[value=mayo-mayo]: [p-whipple drug=0 none=false] (tenant holds 463 pathways)' - the combination did not leak onto a single-procedure case. p-biliary-stent-placement alone (case 

evidence.red_check:
  Two independent red checks, both reverted. (1) Pre-fix class swap: extracted ProcedureCombinationPathwayService.java at e95fa7ae3^ (diffed against HEAD - the only difference is the OR-2776 change), replaced @Slf4j with an explicit org.slf4j.Logger field since lombok is not on the runtime classpath, compiled it inside the container with javac against $(cat /app/jib-classpath-file), backed up the sh

files: /Users/ryanducharme/.claude/jira-watch/state/results/OR-2776
```
