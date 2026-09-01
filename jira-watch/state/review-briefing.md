# Validation loop review — 2026-08-31 14:20

## Stranded worktrees

```
keep   OR-2653      in use — pid 83393 has its cwd in there
keep   OR-2732      in use — pid 75067 has its cwd in there
keep   OR-2754      in use — pid 16178 has its cwd in there
stranded OR-2780    /Users/ryanducharme/dev/worktrees/OR-2780-wrong-dose-error-rate-deep-dive

1 stranded. Re-run with --apply to clear them.
```

## Digest

```
Validation digest — 3 runs since 2026-08-30T18:20:45Z

Closed, with stated limits (1)
  OR-2790  verdict=deploy-ready; posted and transitioned; caveats:

Closed clean (2)
  OR-2803  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2804  verdict=deploy-ready; posted and transitioned; caveats recorded, none material

Skip-listed, not shown above: OR-2603 OR-2691 OR-2775 OR-2777 OR-2799 OR-2780 
Detail on any one: digest.sh <TICKET>
```

## Tickets needing a decision

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

OR-2748  (admitted)
  OR-2748#0    Unit (extend LocalAnestheticHighRemainingDoseTest): with a four-figure remaining dose and NO prior a
  OR-2748#1    Unit (same class): with the allowance exhausted at a four-figure ceiling, assert the citation is the
  OR-2748#2    qa-suite supplemental e2e (new LAST spec): stage a patient whose dosing weight puts a local anesthet

OR-2755  (admitted)
  OR-2755#0    Unit test that scans every @RuleDefinition-annotated class and asserts the full rule-id -> GuidanceC
  OR-2755#1    Unit test asserting no rule declares GuidanceCategory.UNCATEGORIZED outside a small explicit allow-l
  OR-2755#2    Unit test pinning GuidanceCategory.getFriendlyName() for every constant and asserting uniqueness, si
  OR-2755#3    Repository-level test that after startup sync, rule_definitions.guidance_category is non-null for ev

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

OR-2782  (admitted)
  OR-2782#0    Get the two *IntegrationTest classes for this path into a job that actually runs, or split their non
  OR-2782#1    Repository test: updatePrimaryPractitionerIfNotSet must not touch a row whose primary_practitioner_i
  OR-2782#2    Processor test: an In Room SIU that arrives after Anes Start leaves primary_practitioner and last_mo
  OR-2782#3    Processor test: an Anes Start sent by a rostered trainee attributes the trainee over a rostered atte
  OR-2782#4    qa-suite supplemental spec in a new SIU family: inject In Room then Anes Start through the HL7 admin

OR-2790  (admitted_with_caveats)
  OR-2790#0    orci-repositories: @DataJpaTest for MedicationRxNormMappingRepository.findByRxnormCodeIn covering mu
  OR-2790#1    mgb-client-integration: verify MGBGetPatientInfoStrategy calls associateAllergiesViaRxNormMapping wh
  OR-2790#2    mayo-client-integration: verify MayoGetPatientInfoStrategy calls associateAllergiesViaRxNormMapping 
  OR-2790#3    AllergyAssociationServiceTest: add a case asserting an allergy carrying neither an RxNorm nor a SNOM

OR-2792  (admitted)
  OR-2792#0    Extend bundledMayoFileEncodesTheOR2792Pathways to all 14 gyn/urogyn identifiers rather than a 3-proc
  OR-2792#1    Add a negative assertion to the same importer test: the p-hysterectomy-open/-laparoscopic/-robotic/-
  OR-2792#2    Add a resolution test that walks the real bundled Mayo config (not synthetic categories) for a cefaz

OR-2795  (admitted)
  OR-2795#0    FhirUtils extraction driven from a parsed Epic-shaped R4 JSON bundle fixture (valueQuantity with com
  OR-2795#1    MGBGetQTCIntervalR4Command: assert current behavior for a Range/Ratio/String-valued QTc and that the
  OR-2795#2    MGB latest-observations: lock in that a narrative valueString now reaches CREATININE, so the widened

OR-2796  (admitted)
  OR-2796#0    Integration test over EventService CLOSE_APP -> evaluateComplianceForCaseOnStop: firing with EVALUAT
  OR-2796#1    Same integration fixture with EVALUATION_DATE moved past the operation end, asserting compliant=true
  OR-2796#2    Repository-level test that getAdministrationsByMedicationCategoryInDateRange returns empty rather th

OR-2800  (admitted)
  OR-2800#0    Importer test: importing a header-only file into a tenant that already holds pathways must throw rat
  OR-2800#1    Importer test or build guard: seed procedure types from each tenant's master-procedure-types.csv ins
  OR-2800#2    Repository/integration test on the startup path: an unimportable antibiotic-pathways.csv leaves the 

OR-2801  (admitted)
  OR-2801#0    Controller test on GET /api/admin/patients/{pmrn}/operations/{caseId}/antibiotic-candidates assertin
  OR-2801#1    A guard over the shipped mayo, demo and mgb antibiotic-pathways.csv files that fails when a procedur
  OR-2801#2    Rule test that a-known-procedure-wrong-antibiotic abstains when ALL_CONTRAINDICATED was reached thro

OR-2802  (admitted)
  OR-2802#0    qa-suite: a multi-procedure demo case (p-colorectal + p-arthroscopy-knee) asserting the antibiotic-c
  OR-2802#1    qa-suite: a non-covering pair (p-arthroscopy-knee + p-eus-fna-cystic-lesion) asserting outcome SUPPR

OR-2803  (admitted)
  OR-2803#0    Extend MayoProcedureConfigImportIntegrationTest to pin the shipped p-pancreatectomy pair: exactly tw
  OR-2803#1    Add an importer assertion that no shipped org file leaves a procedure with a partially covered risk 
  OR-2803#2    Add a supplemental qa-suite clinical-rules case: low-risk pancreatectomy plus ceftriaxone raises a-k
  OR-2803#3    Add the inverse supplemental qa-suite case: cefazolin on a high-risk pancreatectomy raises the wrong

OR-2804  (admitted)
  OR-2804#0    MayoHL7SiuCaseSchedulingProcessorTest: an SIU whose PV1-4 changes an existing case's acuity verifies
  OR-2804#1    MayoHL7SiuCaseSchedulingProcessorTest: an SIU repeating the acuity already stored, with no AIS segme
  OR-2804#2    MayoHL7SiuCaseSchedulingProcessorTest: an SIU with an unmapped PV1-4 leaves the stored acuity untouc
  OR-2804#3    AntibioticPathwayResolutionSpecTest: assert the 'matched no antibiotic pathway' diagnostic is emitte

OR-2805  (admitted)
  OR-2805#0    qa-suite supplemental: 36.9 kg adult with prior vecuronium and TOF 2 selecting sugammadex returns do
  OR-2805#1    qa-suite supplemental: assert absence -- the same response contains no 73.8/147.6/590.4 mg option, s
  OR-2805#2    qa-suite supplemental: 45 kg adult in the same scenario keeps the configured 50 mg step (100/200/700

OR-2806  (admitted)
  OR-2806#0    Integration test: process a Mayo RAS bolus, then the same ORC-2 + RXA-2 sub-id with a changed dose a
  OR-2806#1    Integration test: same order, new RXA-2 sub-id, and assert a second administration row with its own 
  OR-2806#2    Integration test: a bolus that lands outside the case window (no operation, no tracking id) followed

OR-2819  (admitted_with_caveats)
  OR-2819#0    Integration test: GET the context endpoint for a persisted operation and assert the operation row is
  OR-2819#1    Integration test: assert the read writes exactly one audit_events row with event_type ADMIN_OPERATIO
  OR-2819#2    Integration test: a non-admin session gets 403 on the context endpoint, and an admin under a differe
  OR-2819#3    Integration test: a 404 from a cross-patient operation uuid writes no audit row at all.
  OR-2819#4    Frontend unit test once a runner exists (OR-2702): useFeatureFlags drops unknown ids from the respon

OR-2840  (admitted)
  OR-2840#0    Integration test: a CLOSE_APP category event on a case carrying a SILENT glucose-alert firing plus a
  OR-2840#1    Same integration test's inverse: a glucose one minute past the buffer leaves the row non-compliant, 
  OR-2840#2    Integration test: a firing that gets no CLOSE_APP event keeps its non-compliant fire-time verdict, l
  OR-2840#3    qa-suite supplemental clinical-rules spec: stage a diabetic demo case, drive START_MONITORING, post 
  OR-2840#4    Move ObservationRepositoryGlucoseWindowTest to orci-repositories so it sits with the other repositor

104 open of 107 proposed.
mark: automation.sh done <ID>   |   drop: automation.sh decline <ID> "why"
bundle into a ticket: automation.sh ticket <SOURCE-TICKET>
```

## Eligible for the next sweep

0 ticket(s)
