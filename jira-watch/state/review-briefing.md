# Validation loop review — 2026-10-26 14:25

## Stranded worktrees

```
A run is in progress — refusing to reap anything.
```

## Digest

```
Validation digest — 10 runs since 2026-10-25T18:25:59Z

NEEDS YOU — refused by the gate (1)
  OR-3021  verdict=inconclusive; verdict is 'inconclusive'

Closed, with stated limits (1)
  OR-3023  verdict=deploy-ready; posted and transitioned; caveats:

Closed clean (6)
  OR-3020  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2986  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2842  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2982  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-3009  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2983  verdict=deploy-ready; posted and transitioned; caveats recorded, none material

Skip-listed, not shown above: OR-2603 OR-2691 OR-2775 OR-2777 OR-2799 OR-2780 OR-2783 OR-2914 OR-2901 OR-2915 

WHAT TO DO NEXT
  1 ticket(s) need a decision from you.
  loopcmd review          walk them one at a time with a session (the usual way)
  loopcmd session OR-123  dig into one, in a worktree on its branch
  unblock.sh OR-123       answer it as a Jira comment; the next sweep reads that
  unblock.sh skip OR-123  stop offering it
  loopcmd cover OR-123    turn its proposed tests into a draft PR
  digest.sh OR-123        everything on one ticket: caveats, blockers, evidence
```

## Tickets needing a decision

### OR-3021

```
=== OR-3021 ===

disposition : refused
detail      : verdict=inconclusive; verdict is 'inconclusive'
ran at      : 2026-10-26T15:32:41Z
verdict     : inconclusive
built from  : 00f60b29d62ec1d1953976a0f97c815aa57c818a

blockers:
  - This ticket changes only .github/workflows action pins; it has no behaviour in the local app, so the loop's app-log red check cannot be satisfied. Close by hand if the CI evidence below is accepted.
  - Is the GitHub evidence sufficient to close OR-3021: every action pinned on main resolves to runs.using node24 (or composite of node24), and the latest main run of each active workflow has zero 'Node.js 20 is deprecated' annotations while 2026-10-07 pre-fix runs of maven-ci.yml and pr-gate.yml had them?

caveats:
  - Already merged and live on main since 2026-10-08 (PR #4643); several pins have since been bumped further by Dependabot (checkout@v7, upload-artifact@v7, download-artifact@v8), which the done-criterion still satisfies.
  - deploy.yml is only reached via workflow_call from maven-cd.yml; the post-fix maven-cd run on 2026-10-26 succeeded with no Node 20 annotations, but deploy.yml has no standalone main run since the fix.
  - The nested-action check for composites inspected one level of action.yml only; docker:// steps (getsentry/action-release image) are not Node-runtime dependent.

evidence.positive:
  No app surface exists for this ticket; the fix (PR #4643, merged 2026-10-08 as a854d861e) only changes .github/workflows pins. Static check against the build commit 00f60b29d: grep of every uses: pin across .github/workflows found none of the old pins (checkout@v4, setup-node@v4, upload-artifact@v4, cache@v4, cache/restore@v4, download-artifact@v6, create-github-app-token@v2, configure-aws-credent

evidence.negative:
  Not applicable as an app behaviour. The inverse check that is possible: pre-fix runs of the two workflows the ticket names, from 2026-10-07 (maven-ci 37691417744 and 37687127263, pr-gate 37691417444 and 37689785190), each carry 'Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: ...' annotations naming actions/upload-artifact@v4, actions/ch

evidence.red_check:
  No app-level red check was performed and none is possible: the change has no runtime in the local app, so there is no application-log signature to provoke. The annotation scan was shown to be capable of going red by pointing it at pre-fix CI runs (which it flagged, see negative), but that is GitHub check-run data, not the captured application log, and the swap/data-flip techniques do not apply.

files: /Users/ryanducharme/.claude/jira-watch/state/results/OR-3021
```

## Coverage backlog

```

OR-2669  (admitted_with_caveats)
  OR-2669#0    PractitionerRefreshServiceTest: assert Sentry.captureException is never invoked on the RecordNotFoun
  OR-2669#1    MayoGetPractitionerR4Command unit test: an empty R4 searchset Bundle (total=0) from a stubbed FhirCl

OR-2677  (admitted_with_caveats)
  OR-2677#0    Non-transactional integration test: saveObservations with two glucose observations for the same open
  OR-2677#1    Supplemental test for the per-result guard: stub EventService.handleEventInNewTransaction to throw f
  OR-2677#2    Non-transactional integration test for cancelMedAdmin's afterCommit dispatch, asserting the Medicati

OR-2680  (admitted_with_caveats)
  OR-2680#0    MockMvc (standaloneSetup or @WebMvcTest) class covering both cases: GET /api/admin/observations/pati

OR-2691  (refused)
  OR-2691#0    tools/deploy/tests: a pipeline test that lets the real slack.notify run against a respx-mocked slack
  OR-2691#2    tools/deploy/tests: parametrise the announcement over all five configured environments so a stale ho

OR-2709  (admitted_with_caveats)
  OR-2709#0    qa-suite supplemental clinical-rules scenario: Mayo case carrying exactly p-pancreatectomy + p-bilia
  OR-2709#1    ProcedureBasedWrongAntibioticRuleTest case driven by the shipped Mayo p-pancreatectomy + p-biliary-s
  OR-2709#2    Service test pinning combination behaviour against a case that carries an acuity (urgent/emergent), 

OR-2723  (admitted)
  OR-2723#0    qa-suite @supplemental e2e: Admin -> Manage Data -> Practitioners for an Epic-integrated tenant rend
  OR-2723#1    qa-suite @supplemental e2e (the inverse, with a can-it-fail flip): the same tab for a tenant whose c

OR-2726  (admitted)
  OR-2726#0    ProcedureAntibioticCandidateCacheTest: a case with no configured pathways caches its empty resolutio
  OR-2726#1    ProcedureAntibioticCandidateCacheTest: a cached body with preferred non-empty and protocol.agreed=fa
  OR-2726#2    ProcedureAntibioticCandidateCacheTest: invalidateCachedCandidates(operation) deletes the case key wh
  OR-2726#3    OperationService/DefaultHL7ProcessingContext tests: a launch or scheduling message that moves a case

OR-2748  (admitted)
  OR-2748#0    Unit (extend LocalAnestheticHighRemainingDoseTest): with a four-figure remaining dose and NO prior a
  OR-2748#1    Unit (same class): with the allowance exhausted at a four-figure ceiling, assert the citation is the
  OR-2748#2    qa-suite supplemental LAMD-002 in clinical-rules/local-anesthetic.spec.ts (LAMD-001 already exists):

OR-2755  (admitted)
  OR-2755#1    Unit test asserting no rule declares GuidanceCategory.UNCATEGORIZED outside a small explicit allow-l
  OR-2755#2    Unit test pinning GuidanceCategory.getFriendlyName() for every constant and asserting uniqueness, si
  OR-2755#3    Repository-level test that after startup sync, rule_definitions.guidance_category is non-null for ev

OR-2766  (admitted)
  OR-2766#0    INS-010 (@supplemental, insulin-glucose.spec.ts; INS-008/009 are taken by OR-2743): insulin administ
  OR-2766#1    INS-011 (@supplemental, insulin-glucose.spec.ts): a post-insulin-glucose-check reminder armed on an 

OR-2774  (admitted)
  OR-2774#0    [BLOCKED - separate live defect found during this run, needs its own bug ticket and a fix first] Reg

OR-2776  (admitted)
  OR-2776#0    Parameterize allergyToTheFirstStepFallsToTheCombinationsFallback over shippedCombinations() so the w
  OR-2776#1    Parameterize aFurtherProcedureFallsBackToThePerProcedureWalk over shippedCombinations() so the exact
  OR-2776#2    Add a ProcedureBasedWrongAntibioticRule case driven by the shipped whipple + biliary-stent resolutio

OR-2779  (admitted)
  OR-2779#0    OperationServiceTest: a case already started with erasOperation=false that gains an EVAL_FOR_ERAS pr
  OR-2779#1    PatientController (admin create-operation): a hand-built case whose procedures include an EVAL_FOR_E
  OR-2779#2    OperationServiceTest: a multi-procedure case where only one of several procedures carries EVAL_FOR_E

OR-2782  (admitted)
  OR-2782#1    orci-repositories @DataJpaTest: updatePrimaryPractitionerIfNotSet must not touch a row whose primary
  OR-2782#4    qa-suite @supplemental PRAC-006/PRAC-007 in integrations/mayo/hl7-practitioner-attribution.spec.ts (

OR-2790  (admitted_with_caveats)
  OR-2790#0    orci-repositories: @DataJpaTest for MedicationRxNormMappingRepository.findByRxnormCodeIn covering mu
  OR-2790#1    mgb-client-integration: verify MGBGetPatientInfoStrategy calls associateAllergiesViaRxNormMapping wh
  OR-2790#2    mayo-client-integration: verify MayoGetPatientInfoStrategy calls associateAllergiesViaRxNormMapping 

OR-2791  (refused)
  OR-2791#0    ALG supplemental (API-only, patient-api fixture): RXNORM 3355 allergy then medication-selection m-ke
  OR-2791#1    ALG supplemental: SNOMED 372665008 allergy then m-ketorolac asserts a-general-allergy with ALLERGY_A
  OR-2791#2    ALG supplemental negative: RXNORM 8782 (propofol) allergy then m-ketorolac asserts no a-general-alle
  OR-2791#3    [BLOCKED on OR-2720 - fails today on demo/mgb 5640 -> famotidine/gabapentin/omeprazole and 7258 -> e

OR-2792  (admitted)
  OR-2792#0    Extend bundledMayoFileEncodesTheOR2792Pathways to all 14 gyn/urogyn identifiers rather than a 3-proc
  OR-2792#1    Add a negative assertion to the same importer test: the p-hysterectomy-open/-laparoscopic/-robotic/-

OR-2795  (admitted)
  OR-2795#0    FhirUtils extraction driven from a parsed Epic-shaped R4 JSON bundle fixture (valueQuantity with com
  OR-2795#1    MGBGetQTCIntervalR4Command: characterization test pinning what the quantity-only filter currently do
  OR-2795#2    MGB latest-observations: lock in that a narrative valueString now reaches CREATININE, so the widened

OR-2796  (admitted)
  OR-2796#0    Extend EventServiceCaseStopComplianceIntegrationTest: CLOSE_APP -> evaluateComplianceForCaseOnStop f
  OR-2796#1    Same EventServiceCaseStopComplianceIntegrationTest fixture with EVALUATION_DATE moved past the opera
  OR-2796#2    Repository-level test that getAdministrationsByMedicationCategoryInDateRange returns empty rather th

OR-2800  (admitted)
  OR-2800#0    [BLOCKED - live defect, needs a bug ticket and a fix first] Importer test: importing a header-only f
  OR-2800#1    Importer test or build guard: seed procedure types from each tenant's master-procedure-types.csv ins

OR-2801  (admitted)
  OR-2801#0    Controller test on GET /api/admin/patients/{pmrn}/operations/{caseId}/antibiotic-candidates assertin
  OR-2801#1    Pin the rule-5 shape per shipped file: for mayo, demo and mgb antibiotic-pathways.csv assert the exa

OR-2802  (admitted)
  OR-2802#0    qa-suite: a multi-procedure demo case (p-colorectal + p-arthroscopy-knee) asserting the antibiotic-c

OR-2803  (admitted)
  OR-2803#0    Pin the shipped p-pancreatectomy pair in AntibioticPathwayCSVImporterTest next to bundledMayoFileEnc
  OR-2803#1    Add an importer assertion that no shipped org file leaves a procedure with a partially covered risk 
  OR-2803#2    Add a supplemental qa-suite clinical-rules case: low-risk pancreatectomy plus ceftriaxone raises a-k
  OR-2803#3    Add the inverse supplemental qa-suite case: cefazolin on a high-risk pancreatectomy raises the wrong

OR-2804  (admitted)
  OR-2804#0    MayoHL7SiuCaseSchedulingProcessorTest: an SIU whose PV1-4 changes an existing case's acuity verifies
  OR-2804#1    MayoHL7SiuCaseSchedulingProcessorTest: an SIU repeating the acuity already stored, with no AIS segme
  OR-2804#2    MayoHL7SiuCaseSchedulingProcessorTest: an SIU with an unmapped PV1-4 leaves the stored acuity untouc

OR-2805  (admitted)
  OR-2805#0    SUG-005 (@supplemental, sugammadex.spec.ts; SUG-003/004 are claimed by OR-2886): 36.9 kg adult with 
  OR-2805#2    SUG-006 (@supplemental, sugammadex.spec.ts): 45 kg adult in the same scenario keeps the configured 5

OR-2806  (admitted)
  OR-2806#0    Integration test: process a Mayo RAS bolus, then the same ORC-2 + RXA-2 sub-id with a changed dose a
  OR-2806#1    Integration test: same order, new RXA-2 sub-id, and assert a second administration row with its own 
  OR-2806#2    Integration test: a bolus that lands outside the case window (no operation, no tracking id) followed

OR-2819  (admitted_with_caveats)
  OR-2819#0    Integration test: GET the context endpoint for a persisted operation and assert the operation row is
  OR-2819#1    Integration test: assert the read writes exactly one audit_events row with event_type ADMIN_OPERATIO
  OR-2819#2    Integration test: a non-admin session gets 403 on the context endpoint, and an admin under a differe
  OR-2819#3    Integration test: a 404 from a cross-patient operation uuid writes no audit row at all.

OR-2840  (admitted)
  OR-2840#0    Extend EventServiceCaseStopComplianceIntegrationTest: a CLOSE_APP category event on a case carrying 
  OR-2840#1    Same integration test's inverse: a glucose one minute past the buffer leaves the row non-compliant, 
  OR-2840#2    Integration test: a firing that gets no CLOSE_APP event keeps its non-compliant fire-time verdict, l
  OR-2840#4    Move ObservationRepositoryGlucoseWindowTest to orci-repositories so it sits with the other repositor

OR-2842  (admitted)
  OR-2842#0    Backend (orci/src/test, @SpringBootTest + MockMvc): GET /v3/api-docs -> paths has no key containing 
  OR-2842#1    Backend (same test class): GET /api/launch-by-operation/{unknown uuid} -> 404 Operation not found, p
  OR-2842#2    Backend generic guard: for every operation in /v3/api-docs, no 200 response schema $ref resolves to 

OR-2845  (admitted)
  OR-2845#0    AllergyCrossReactionGroupCSVImporterTest: seed SULFONAMIDE alongside NSAID and assert the demo file 
  OR-2845#1    Seed-consistency test (BundledAntibioticPathwayTest style): every master-medication-list row whose t
  OR-2845#2    qa-suite ALG supplemental: RXNORM 9524 allergy -> select m-sulfamethoxazole-trimethoprim-iv -> a-gen
  OR-2845#3    qa-suite ALG supplemental: SNOMED 387406002 allergy -> same medication -> a-general-allergy fires.
  OR-2845#4    qa-suite ALG supplemental negative: NSAID SNOMED 372665008 allergy -> SMX/TMP IV selection yields no

OR-2886  (admitted)
  OR-2886#0    SUG-003 (@supplemental, sugammadex.spec.ts): case with a rocuronium infusion documented only by a ST
  OR-2886#1    SUG-004 (@supplemental, sugammadex.spec.ts): same case with only the STOP-only infusion; assert the 

OR-2921  (admitted)
  OR-2921#0    qa-suite supplemental (mayo-mayo): SIU S14 with AIS DILATATION AND CURETTAGE alone, then POST /api/c
  OR-2921#1    qa-suite supplemental (mayo-mayo): SIU S14 with AIS DILATATION AND CURETTAGE + HYSTERECTOMY TOTAL AB
  OR-2921#2    qa-suite supplemental (mayo-mayo): SIU S14 with AIS DILATATION AND CURETTAGE + an unknown procedure 
  OR-2921#3    qa-suite supplemental (mayo-mayo): SIU S14 with AIS DILATATION AND CURETTAGE + EXAMINATION UNDER ANE

OR-2926  (refused)
  OR-2926#0    qa-suite @core smoke (SMOKE family): GET /actuator/info (or a small admin endpoint exposing Runtime.
  OR-2926#1    Backend build-time check (surefire in orci module): assert every class in the orci-utils / orci-mode

OR-2928  (admitted)
  OR-2928#0    QuartzJobServiceTest (unit, default suite): getStaleJobKeys with a mocked Scheduler returns only sta

OR-2931  (admitted)
  OR-2931#0    mayo-client-integration or orci Spring integration test: RAS Intralipid bolus in g for a NORMAL-weig
  OR-2931#1    Same harness with an empty mapping concentration: gram dose persists and scores compliant (incompara

OR-2944  (admitted_with_caveats)
  OR-2944#0    PABX supplemental: p-colorectal with a cefazolin bolus only, PROCEDURE_START -> exactly one a-incomp
  OR-2944#1    PABX supplemental (shared lockout): p-colorectal, PROCEDURE_START with nothing given fires NONE_GIVE
  OR-2944#2    PABX supplemental: assert details.PATHWAY_STATUS is NONE_GIVEN on the existing PABX-019 control firi

OR-2945  (admitted)
  OR-2945#0    INS-0xx @supplemental: insulin selection + subcutaneous dose differing from the rule's SC default ->
  OR-2945#1    INS-0xx @supplemental: same staging, dose equal to the SC default -> default-dose compliant=true (po
  OR-2945#2    Optional: intravenous mismatch/match pair asserting the IV default (4 units at glucose 220 on the MG

OR-2949  (admitted)
  OR-2949#0    PABX @supplemental: colorectal (cefazolin+metronidazole pathway) case with only cefazolin documented
  OR-2949#1    PABX @supplemental: GET /api/admin/rule/definitions excludes a-known-procedure-missing-antibiotic an

OR-2950  (admitted)
  OR-2950#0    qa-suite @supplemental (new HL7 integration-auth spec): mint a tenant token for tenant A via POST /a
  OR-2950#1    qa-suite @supplemental: same token with ?client_id=B asserts 403; same token with X-Tenant-Id: A and
  OR-2950#2    qa-suite @supplemental: revoke the minted tokens via DELETE /api/admin/tokens/{token} in teardown so

OR-2951  (admitted)
  OR-2951#0    Testcontainers integration test: dispatch 4 RAS + 4 ORU messages for one unseen PMRN concurrently th
  OR-2951#1    MayoHL7OruFlowsheetProcessorTest: unknown patient resolves via hl7ProcessingContext.findOrCreatePati
  OR-2951#2    MayoHL7RasMedAdminProcessorTest: completion-status-canceled message for an unseen patient captures t
  OR-2951#3    Supplemental: MayoHl7PatientSkeleton.from with blank PID-5, PID-7 and PID-8 yields null name/dob/gen

OR-2960  (admitted)
  OR-2960#0    RuleServiceConfigCacheRefreshTest: saveStoredConfiguration on this instance is visible to getConfig 

OR-2964  (admitted)
  OR-2964#0    Maven enforcer bannedDependencies rule (root pom) for org.springframework.data:spring-data-envers an

OR-2965  (admitted)
  OR-2965#0    InternalNotificationServiceTest (GreenMail, same extension as SmtpLogbackAppenderTest): sendSimpleIn
  OR-2965#1    InternalNotificationServiceTest: no JavaMailSender bean / empty notification-addresses -> nothing se
  OR-2965#2    Optional single-assertion classpath guard in orci: Session.getInstance(new Properties()).getTranspor

OR-2978  (admitted)
  OR-2978#0    AntibioticPathwayResolutionSpecTest: a SNOMED-coded allergy (372788003) in the SULFONAMIDE cross-rea
  OR-2978#1    ProcedureBasedWrongAntibioticRule test: sulfa-allergic patient on a SMX-TMP -> CEFAZOLIN pathway sel
  OR-2978#2    AllergyAssociationServiceTest: SNOMED 372788003 and RxNorm 10831 each produce a single SULFONAMIDE c

OR-2982  (admitted)
  OR-2982#0    LAMD-002 @supplemental: adult female 142 cm / 70 kg selects Lidocaine; assert w-last-local-anestheti
  OR-2982#1    MISC-008 @supplemental: adult female 142 cm / 70 kg / creatinine 1.1 selects Ketorolac; assert w-ket
  OR-2982#2    LAMD-003 @supplemental: adult female 96 cm / 30 kg selects Lidocaine; assert WEIGHT_CALCULATION_TYPE

OR-2983  (admitted)
  OR-2983#0    qa-suite @supplemental (clinical-rules): ERAS hysterectomy case with two same-class antiemetic admin
  OR-2983#1    qa-suite @supplemental sibling: same staging with two different-class antiemetics, assert a-eras-ant
  OR-2983#2    ERASAntiemeticsRuleTest: two NK1 antagonists (aprepitant + a second NK1 mock) yield 'of class NK1-An

OR-2986  (admitted)
  OR-2986#0    AF-008 @supplemental (app-features): delay /api/cds/medication-selection/** via page.route, select C
  OR-2986#1    AF-009 @supplemental (app-features): same delay, click the Induction macro, assert four placeholder 
  OR-2986#2    NDC-006 @supplemental (scanner): delayed scan of an unmapped NDC shows the 'Loading medication…' pla
  OR-2986#3    AF-010 @supplemental (app-features): fulfill the lookup with a 500 and assert the pending tab shows 

OR-2987  (admitted)
  OR-2987#0    NDC-006 @supplemental (scanner/unknown-ndc-flow or new ndc-patterns spec): POST /api/cds/medication-
  OR-2987#1    NDC-007 @supplemental: lowercase '~s04...' variant of the same label also resolves to m-propofol (lo
  OR-2987#2    NDC-008 @supplemental: admin multipart upload to /api/admin/config-imports/ndc-patterns/upload of a 

OR-2993  (admitted)
  OR-2993#0    PABX supplemental: p-hysterectomy with metronidazole 500 mg INTRAVENOUS plus cefazolin 2000 mg on ro
  OR-2993#1    PABX supplemental: p-hysterectomy with cefazolin 2000 mg on GASTRIC_TUBE only, PROCEDURE_START -> ex
  OR-2993#2    ARD supplemental: cefazolin bolus on GASTRIC_TUBE -> GET /api/admin/quartz/jobs?caseId lists an anti

OR-3009  (admitted)
  OR-3009#0    APAP-001 @supplemental: adult 80 kg, 4,000 mg IV acetaminophen bolus staged 23h45m earlier via /api/
  OR-3009#1    APAP-002 @supplemental (positive control for 001): same staging at 23h15m; a-acetaminophen-max-dose-
  OR-3009#2    APAP-003 @supplemental: 3,500 mg at 23h45m then medication-dose 1,000 mg returns no a-acetaminophen-
  OR-3009#3    APAP-004 @supplemental: 1,000 mg at 5h50m earlier returns no a-acetaminophen-early-redose; at 5h40m 

OR-3020  (admitted)
  OR-3020#0    orci OnHeparinWithoutPTTTest: latestStopBeyondSixHoursAbstainsEvenWhenANewerRecordStoppedEarlier - r
  OR-3020#1    qa-suite clinical-rules new spec preop-ptt.spec.ts, PTT-001 @supplemental: stage two IV m-heparin in
  OR-3020#2    qa-suite PTT-002 @supplemental: same staging with older record STOP -8h and newer record STOP -22h; 
  OR-3020#3    qa-suite PTT-003 @supplemental: single infusion STOP -5h with no PTT observation alerts; a second ca

OR-3021  (refused)
  OR-3021#0    Optional: a workflow-lint step that resolves runs.using for every pinned action and fails on node20 

OR-3023  (admitted_with_caveats)
  OR-3023#0    Backend @SpringBootTest/@WebMvcTest slice with properties tenants.mgb.enabled=false asserting the MG
  OR-3023#1    Backend test for NotificationSimulationService/SimulationController send-notification under tenants.
  OR-3023#2    qa-suite @supplemental smoke test (e.g. SEC-NNN) that POST /api/integration/mgb/event, /api/integrat

OR-2791  (refused)
  OR-2791#a1   [BLOCKED on OR-2720] ALG supplemental: RXNORM 5640 (ibuprofen) allergy then m-ketorolac asserts a-ge

OR-2918  (admitted)
  OR-2918#a1   Supplemental API-level positive/negative pair in qa-suite for the ERAS antiemetics path that raised 

146 open of 183 proposed.
mark: automation.sh done <ID>   |   drop: automation.sh decline <ID> "why"
bundle into a ticket: automation.sh ticket <SOURCE-TICKET>
```

## Eligible for the next sweep

4 ticket(s)
