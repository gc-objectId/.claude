# Validation loop review — 2026-09-30 09:40

## Stranded worktrees

```
A run is in progress — refusing to reap anything.
```

## Digest

```
Validation digest — 8 runs since 2026-09-29T13:40:41Z

NEEDS YOU — refused by the gate (2)
  OR-2959  verdict=not-deploy-ready; verdict is 'not-deploy-ready'
  OR-2926  verdict=inconclusive; verdict is 'inconclusive'

NEEDS YOU — no merged PR, nothing to validate (1)
  OR-2901  no merged PR within the search window; needs a human disposition

Closed clean (4)
  OR-2951  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2928  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2945  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2931  verdict=deploy-ready; posted and transitioned; caveats recorded, none material

Skip-listed, not shown above: OR-2603 OR-2691 OR-2775 OR-2777 OR-2799 OR-2780 OR-2783 OR-2914 

WHAT TO DO NEXT
  3 ticket(s) need a decision from you.
  loopcmd review          walk them one at a time with a session (the usual way)
  loopcmd session OR-123  dig into one, in a worktree on its branch
  unblock.sh OR-123       answer it as a Jira comment; the next sweep reads that
  unblock.sh skip OR-123  stop offering it
  loopcmd cover OR-123    turn its proposed tests into a draft PR
  digest.sh OR-123        everything on one ticket: caveats, blockers, evidence
```

## Tickets needing a decision

### OR-2901

```
=== OR-2901 ===

disposition : no_merged_pr
detail      : no merged PR within the search window; needs a human disposition
ran at      : 2026-09-29T21:00:56Z
verdict     : 
built from  : 

files: /Users/ryanducharme/.claude/jira-watch/state/results/OR-2901
```

### OR-2926

```
=== OR-2926 ===

disposition : refused
detail      : verdict=inconclusive; verdict is 'inconclusive'
ran at      : 2026-09-29T21:01:53Z
verdict     : inconclusive
built from  : 4b0324df9eda299c8efa0fdc5b8cf51575b23fae

blockers:
  - This is a build/CI/runtime ticket with no app-level red check; the done criteria (CI, full suite, dev deploy on Java 25) were verified from GitHub run history (CI Build + PR Gate green on 11c708574, dev deploys green on main since 2026-09-17 incl. today's 4b0324df9). Is that GitHub evidence plus the Temurin-25 runtime observation sufficient to close OR-2926 by hand?
  - Ticket bullet 'Confirm the MGB OpenShift environment can run a Java 25 image' could not be checked (api.prod-shared-aro-e2.partners.org unreachable from here). Has MGB confirmed, or is it deferred to their next image pull?
  - The dev deploy on the merge commit failed on ecs:TagResource (IAM, run 35005722169) and later deploys passed. Was the IAM policy fixed deliberately, so nothing remains open from that failure?

caveats:
  - MGB OpenShift compatibility with the eclipse-temurin:25-jdk-jammy image was never exercised; the base-image family is unchanged so risk is low, but it is a stated ticket deliverable.
  - Java 25 runtime prints JEP 472 warnings at boot: 'A restricted method in java.lang.System has been called' (java.lang.System::loadLibrary from io.netty.util.internal.NativeLibraryUtil, netty-common-4.2.17) and a sun.misc.Unsafe::objectFieldOffset warning from ehcache-3.10.8; harmless today but a future JDK will block the netty call unless --enable-native-access=ALL-UNNAMED is added to the JVM args.
  - The loop image's orci-utils-0.1.101-SNAPSHOT.jar contains Java 21 bytecode (major 65, classes dated 2026-08-26, manifest Build-Jdk-Spec 21) because the loop's ~/dev/worktrees/_loop-main checkout had stale target/classes ('Nothing to compile - all classes are up to date' in sweep.log). Not a code defect (a clean compile yields major 69, and CI/CD run clean install), but _loop-main/orci-utils/target should be cleaned so loop images are fully Java 25.
  - CI Build runs the unit suite via mvnw install; the -P integration-tests profile is not part of CI, so 'full test suite on Java 25' means the CI suite. It was not re-run locally here.
  - Root Dockerfile was updated to temurin 25 rather than deleted; it was not built or exercised (the instance under test is the jib image).
  - The only Java source change (ApplicationRunner) is comment-only; no behavioural code path was exercised beyond boot, health, login and /api/user/info.

evidence.positive:
  The instance built from 4b0324df9 (main, contains merge df1ae41cc of PR #4562) runs on Java 25: `docker exec ... java -version` reports Temurin-25.0.4.1+1-LTS; the container log's startup line reads 'Starting OrciApplication using Java 25.0.4.1 with PID 1' and 'Started OrciApplication in 90.823 seconds'; /actuator/health/readiness returned 200 {"status":"UP"}; every class under /app/classes has cl

evidence.negative:
  Java-21 toolchain remnants: no module pom or workflow still pins 21 (grep of java.version / java-version / maven.compiler.* across pom.xml, orci*/pom.xml, .github/workflows/*.yml finds only 25 or ${java.version}). No Java-25-caused errors in the app log: the 2495 ERROR lines are all MedicationNDCMappingImporter / MedicationDosingCSVImporter tenant data-import noise, none reference class loading, m

evidence.red_check:
  Flipped the runtime instead of the code: copied the shipped /app/classes/com/guided/orci/OrciApplication.class out of the app container and launched it on a Java 21 JVM (docker run eclipse-temurin:21-jre-jammy java -cp /c com.guided.orci.OrciApplication). It went red with 'java.lang.UnsupportedClassVersionError: com/guided/orci/OrciApplication has been compiled by a more recent version of the Java

files: /Users/ryanducharme/.claude/jira-watch/state/results/OR-2926
```

### OR-2959

```
=== OR-2959 ===

disposition : refused
detail      : verdict=not-deploy-ready; verdict is 'not-deploy-ready'
ran at      : 2026-09-29T21:27:12Z
verdict     : not-deploy-ready
built from  : ff735801d85863b57fc1ee3cf100514c4256ac2e

blockers:
  - The code half validates cleanly, but the ticket also says to delete -Dcompliance.results.process.missing-only=true from the dev, stage and prod task definitions, and the active revisions (guidedor-dev:747, guidedor-stage:92, guidedor-prod:59) still carry it. Should the flag be removed from the three task definitions before this ticket closes, or is that being dropped or split to a follow-up?
  - The ticket asks to confirm the MGB OpenShift deployment does not set compliance.results.process.enabled before merging. That cannot be checked from this environment (no oc access; the deploy tool does not set it). Has someone confirmed it on the MGB cluster?

caveats:
  - The removed startup backfill was validated only by its startup log lines; the demo tenant had no rule firings, so the pre-fix runner found nothing to score during the red check.
  - The live compliance path was exercised through the case-stop route with zero rule firings (compliance evaluation ran, but no compliance_results row was produced); the per-administration route was not exercised.
  - Task-definition and MGB OpenShift deliverables are outside the running app; the task definitions were read via the AWS CLI and still carry the missing-only flag, and MGB could not be checked at all.
  - Liquibase changeset 227 (backfill-preop-doxycycline-compliance) still has a comment describing the compliance result processor and its missing-only flag; harmless, but now describes code that no longer exists.

evidence.positive:
  On the shipped ff735801d build (container orci-loop-or-2959-orci-1), confirmed /app/classes/com/guided/orci/spring/ComplianceResultRunner.class is absent and the boot log contains zero 'compliance result runner' lines. Then exercised the live compliance path that the ticket says stays: created a demo-demo patient and case 03706 via the admin API, started it as loopuser through POST /api/app-launch

evidence.negative:
  Added -Dcompliance.results.process.enabled=true to /app/entrypoint.sh on the shipped classes and restarted the container. /proc/1/cmdline confirmed the flag was on the JVM. App reached readiness UP and logged 'Started OrciApplication in 11.226 seconds'; grep of the log since that restart for 'compliance result runner' returned 0 lines, so the enabling flag is now inert and no startup backfill runs

evidence.red_check:
  Compiled the parent commit's ComplianceResultRunner, StartupPhase (with COMPLIANCE_RESULT_EVAL), RuleComplianceService (with processComplianceResults) and RuleFiredResultRepository (with streamAll/streamAllWithoutComplianceResult) inside the container with javac against the jib classpath (lombok @Slf4j replaced by explicit loggers), copied them into /app/classes (shadowing the repositories jar), k

files: /Users/ryanducharme/.claude/jira-watch/state/results/OR-2959
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

OR-2945  (admitted)
  OR-2945#0    INS-0xx @supplemental: insulin selection + subcutaneous dose differing from the rule's SC default ->
  OR-2945#1    INS-0xx @supplemental: same staging, dose equal to the SC default -> default-dose compliant=true (po
  OR-2945#2    Optional: intravenous mismatch/match pair asserting the IV default (4 units at glucose 220 on the MG

OR-2951  (admitted)
  OR-2951#0    Testcontainers integration test: dispatch 4 RAS + 4 ORU messages for one unseen PMRN concurrently th
  OR-2951#1    MayoHL7OruFlowsheetProcessorTest: unknown patient resolves via hl7ProcessingContext.findOrCreatePati
  OR-2951#2    MayoHL7RasMedAdminProcessorTest: completion-status-canceled message for an unseen patient captures t
  OR-2951#3    Supplemental: MayoHl7PatientSkeleton.from with blank PID-5, PID-7 and PID-8 yields null name/dob/gen

OR-2791  (refused)
  OR-2791#a1   [BLOCKED on OR-2720] ALG supplemental: RXNORM 5640 (ibuprofen) allergy then m-ketorolac asserts a-ge

98 open of 135 proposed.
mark: automation.sh done <ID>   |   drop: automation.sh decline <ID> "why"
bundle into a ticket: automation.sh ticket <SOURCE-TICKET>
```

## Eligible for the next sweep

0 ticket(s)
