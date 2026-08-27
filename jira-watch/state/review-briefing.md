# Validation loop review — 2026-08-27 09:35

## Stranded worktrees

```
stranded OR-2656    /Users/ryanducharme/dev/worktrees/OR-2656-missing-med-admins-question
keep   OR-2743      1 commits ahead, 0 dirty files — has work in it

1 stranded. Re-run with --apply to clear them.
```

## Digest

```
Validation digest — 15 runs since 2026-08-26T13:35:19Z

NEEDS YOU — no merged PR, nothing to validate (1)
  OR-2780  no merged PR within the search window; needs a human disposition

Closed clean (12)
  OR-2840  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2792  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2766  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2774  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2745  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2806  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2796  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2797  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2779  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2776  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2833  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2805  verdict=deploy-ready; posted and transitioned; caveats recorded, none material

Skip-listed, not shown above: OR-2603 OR-2691 OR-2775 OR-2777 OR-2799 
Detail on any one: digest.sh <TICKET>
```

## Tickets needing a decision

### OR-2780

```
=== OR-2780 ===

disposition : no_merged_pr
detail      : no merged PR within the search window; needs a human disposition
ran at      : 2026-08-26T20:27:26Z
verdict     : 
built from  : 

files: /Users/ryanducharme/.claude/jira-watch/state/results/OR-2780
```

## Coverage backlog

```

OR-2603  (refused)
  OR-2603#0    Harness: a JUnit/Testcontainers or psql-driven fixture test that runs orci/src/main/analytics/mgb-mg
  OR-2603#1    Boundary regression for shared_error_rate_by_month_local_anesthetic.sql: administrations at Eastern 
  OR-2603#2    Same boundary regression for shared_error_rate_by_month_local_anesthetic_practitioner_filtered.sql a
  OR-2603#3    DST boundary case: an administration on the March DST-change day, asserting the Eastern bucket is no
  OR-2603#4    Deepdive rule-status coverage: one LA administration per case - alert rejected, alert accepted, SILE
  OR-2603#5    Deepdive provider resolution: an administration with no documenting practitioner must report the ope
  OR-2603#6    Reconciliation guard: deepdive row counts and non-compliant counts per month/mode must equal the sha

OR-2669  (admitted_with_caveats)
  OR-2669#0    PractitionerRefreshServiceTest: assert Sentry.captureException is never invoked on the RecordNotFoun
  OR-2669#1    MayoGetPractitionerR4Command unit test: an empty R4 searchset Bundle (total=0) from a stubbed FhirCl
  OR-2669#2    PractitionerAdminControllerTest: a refresh whose lookup throws RecordNotFoundException returns 200 w
  OR-2669#3    Mayo SIU processor integration test: an SIU^S14 whose SCH-20 PERSONID has no FHIR Practitioner still

OR-2677  (admitted_with_caveats)
  OR-2677#0    Non-transactional integration test: saveObservations with two glucose observations for the same open
  OR-2677#1    Supplemental test for the per-result guard: stub EventService.handleEventInNewTransaction to throw f
  OR-2677#2    Non-transactional integration test for cancelMedAdmin's afterCommit dispatch, asserting the Medicati
  OR-2677#3    Assertion in the existing glucose dispatch integration test that no InvalidDataAccessApiUsageExcepti

OR-2678  (admitted_with_caveats)
  OR-2678#0    Add a captured-fixture variant of rormc-siu-s14-before.hl7 with ZCS-5 populated and assert the proce
  OR-2678#1    Add a processor test asserting a resend with no ZCS-5 does not clear an already-set asaStatus, locki

OR-2680  (admitted_with_caveats)
  OR-2680#0    MockMvc (standaloneSetup or @WebMvcTest) test asserting GET /api/admin/observations/patient/{unknown
  OR-2680#1    Companion MockMvc case asserting GET for an existing patient responds 200 with the observation list,

OR-2691  (refused)
  OR-2691#0    tools/deploy/tests: a pipeline test that lets the real slack.notify run against a respx-mocked slack
  OR-2691#1    tools/deploy/tests: assert config.SLACK_CHANNEL is a Slack channel ID and not a #name, so a future e
  OR-2691#2    tools/deploy/tests: parametrise the announcement over all five configured environments so a stale ho
  OR-2691#3    CI lint: add actionlint to the workflow-lint job so .github/workflows/deploy.yml expression and cont
  OR-2691#4    CI: a workflow test that renders the deploy.yml notification text for dev/stage/prod inputs and asse

OR-2709  (admitted_with_caveats)
  OR-2709#0    qa-suite supplemental clinical-rules scenario: Mayo case carrying exactly p-pancreatectomy + p-bilia
  OR-2709#1    Integration test that KnownProcedureNoAntibioticRule and KnownProcedureAntibioticNotRecommendedRule 
  OR-2709#2    Service test pinning combination behaviour against a case that carries an acuity (urgent/emergent), 

OR-2723  (admitted)
  OR-2723#0    qa-suite @supplemental e2e: Admin -> Manage Data -> Practitioners for an Epic-integrated tenant rend
  OR-2723#1    qa-suite @supplemental e2e (the inverse, with a can-it-fail flip): the same tab for a tenant whose c
  OR-2723#2    qa-suite @supplemental API test: per-row refresh of a practitioner whose id Epic has no record for r
  OR-2723#3    qa-suite @supplemental API test: POST /api/admin/practitioners/refresh with 201 ids returns 400 and 

OR-2726  (admitted)
  OR-2726#0    ProcedureAntibioticCandidateCacheTest: a case with no configured pathways caches its empty resolutio
  OR-2726#1    ProcedureAntibioticCandidateCacheTest: a cached body with preferred non-empty and protocol.agreed=fa
  OR-2726#2    ProcedureAntibioticCandidateCacheTest: invalidateCachedCandidates(operation) deletes the case key wh
  OR-2726#3    OperationService/DefaultHL7ProcessingContext tests: a launch or scheduling message that moves a case
  OR-2726#4    An integration test that round-trips through a real Redis/Valkey rather than a mocked RedisService, 

OR-2755  (reserved)
  OR-2755#0    orci: classpath-scan every @RuleDefinition and assert no rule is UNCATEGORIZED except an explicit al
  OR-2755#1    orci: assert every rule whose identifier or class is insulin/glucose/hypoglycemia-related declares G
  OR-2755#2    orci: assert MONITORING is now claimed only by the coagulation-lab rules (a-preop-pt-inr, a-preop-pt

OR-2766  (admitted)
  OR-2766#0    INS-008 (@supplemental): insulin administration posted on a case whose end_time is already set arms 
  OR-2766#1    INS-009 (@supplemental): a post-insulin-glucose-check reminder armed on an open case survives a proc
  OR-2766#2    Backend test in ScheduledRuleEngineTest: assert no post-insulin-glucose-check job_metadata row is ev

OR-2774  (admitted)
  OR-2774#0    Regression test for the separate defect: concurrent SIU^S14 messages for one (patient, case) must no
  OR-2774#1    Optional supplemental check that repeated patient refreshes leave patient_allergies and patient_medi

OR-2776  (admitted)
  OR-2776#0    Parameterize allergyToTheFirstStepFallsToTheCombinationsFallback over shippedCombinations() so the w
  OR-2776#1    Parameterize aFurtherProcedureFallsBackToThePerProcedureWalk over shippedCombinations() so the exact
  OR-2776#2    Add a ProcedureBasedWrongAntibioticRule case driven by the shipped whipple + biliary-stent resolutio

OR-2779  (admitted)
  OR-2779#0    OperationServiceTest: a case already started with erasOperation=false that gains an EVAL_FOR_ERAS pr
  OR-2779#1    PatientController (admin create-operation): a hand-built case whose procedures include an EVAL_FOR_E
  OR-2779#2    OperationServiceTest: a multi-procedure case where only one of several procedures carries EVAL_FOR_E

OR-2782  (running)
  OR-2782#0    qa-suite HL7 e2e: inject an In Room SIU then an Anes Start SIU whose AIP 2.10 row names a PERID, and
  OR-2782#1    qa-suite HL7 e2e negative: Anes Start first, then an In Room SIU from a different sender carrying a 
  OR-2782#2    qa-suite HL7 e2e edge: an Anes Start whose AIP anesthesia rows carry no identifier leaves the existi
  OR-2782#3    Give the practitioner race coverage a CI-run surface - a *Test-named variant of DefaultHL7Processing
  OR-2782#4    Backend test on a non-Mayo tenant that a second app-launch by a different user takes ownership of an

OR-2792  (admitted)
  OR-2792#0    Extend bundledMayoFileEncodesTheOR2792Pathways to all 14 gyn/urogyn identifiers rather than a 3-proc
  OR-2792#1    Add a negative assertion to the same importer test: the p-hysterectomy-open/-laparoscopic/-robotic/-
  OR-2792#2    Add a resolution test that walks the real bundled Mayo config (not synthetic categories) for a cefaz

OR-2796  (admitted)
  OR-2796#0    Integration test over EventService CLOSE_APP -> evaluateComplianceForCaseOnStop: firing with EVALUAT
  OR-2796#1    Same integration fixture with EVALUATION_DATE moved past the operation end, asserting compliant=true
  OR-2796#2    Repository-level test that getAdministrationsByMedicationCategoryInDateRange returns empty rather th

OR-2805  (admitted)
  OR-2805#0    qa-suite supplemental: 36.9 kg adult with prior vecuronium and TOF 2 selecting sugammadex returns do
  OR-2805#1    qa-suite supplemental: assert absence -- the same response contains no 73.8/147.6/590.4 mg option, s
  OR-2805#2    qa-suite supplemental: 45 kg adult in the same scenario keeps the configured 50 mg step (100/200/700

OR-2806  (admitted)
  OR-2806#0    Integration test: process a Mayo RAS bolus, then the same ORC-2 + RXA-2 sub-id with a changed dose a
  OR-2806#1    Integration test: same order, new RXA-2 sub-id, and assert a second administration row with its own 
  OR-2806#2    Integration test: a bolus that lands outside the case window (no operation, no tracking id) followed

OR-2840  (admitted)
  OR-2840#0    Integration test: a CLOSE_APP category event on a case carrying a SILENT glucose-alert firing plus a
  OR-2840#1    Same integration test's inverse: a glucose one minute past the buffer leaves the row non-compliant, 
  OR-2840#2    Integration test: a firing that gets no CLOSE_APP event keeps its non-compliant fire-time verdict, l
  OR-2840#3    qa-suite supplemental clinical-rules spec: stage a diabetic demo case, drive START_MONITORING, post 
  OR-2840#4    Move ObservationRepositoryGlucoseWindowTest to orci-repositories so it sits with the other repositor

72 open of 75 proposed.
mark: automation.sh done <ID>   |   drop: automation.sh decline <ID> "why"
bundle into a ticket: automation.sh ticket <SOURCE-TICKET>
```

## Eligible for the next sweep

10 ticket(s)
