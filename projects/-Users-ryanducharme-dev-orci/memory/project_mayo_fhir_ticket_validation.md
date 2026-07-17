---
name: mayo-fhir-ticket-validation
description: "Per-ticket validation of Mayo FHIR command tickets (OR-2434 epic) — .pending staging area, MFHIR qa-suite family, OR-2557 + OR-2537 done"
metadata: 
  node_type: memory
  type: project
  originSessionId: 60db3a7f-4d1f-47ac-8015-aaa66c56fc87
---

Validation of the Mayo FHIR command tickets under epic OR-2434, handled **one ticket per worktree per SOP** (Ryan's 2026-07-08 decision after an umbrella-branch approach got unwieldy).

**⚠️ Staged work lives at `~/dev/worktrees/.pending/`** — per-ticket unit tests + a reference e2e spec written in the OR-2557 session, waiting for their own worktrees. READ ITS README AT PICKUP: files are May-2026-era and main has moved (practitioner command was rewritten PROVID→PERID after they were written; infection-status + family-member-history commands now exist). Always diff the command under test against current main and check for an existing test on main before copying anything in.

**OR-2557 (Get Practitioner): CLOSED** — ticket Done 2026-07-09, PR #4090 merged 2026-07-16 (Jordan approved), worktree torn down. Tests on main: 4 unit edge cases in `MayoGetPractitionerR4CommandTest` + qa-suite `MFHIR-001..003`. Jordan raised no objection to harness-coupled live e2e in qa-suite — pattern is accepted; extend the MFHIR family for sibling tickets.

**OR-2552 (Glucose): VALIDATED, ticket Done 2026-07-16** — glucose maps via `GET_OBSERVATIONS_LATEST` (Epic OID system, code 1911200034, string value parsed). qa-suite `MFHIR-004/005` on PR #4129 (draft; worktree OR-2552-FHIR-get-glucose still open pending merge). Glucose-bearing staging patients: Douglas 11292545, Rosamond 11292544; Jeremy 11279484 is the no-glucose negative. **Flag for prod go-live:** ObservationSets.csv only carries TST OIDs for glucose/PTT/INR/eGFR — prod OID (`...451.2.7.2...`) differs, so `GET_OBSERVATIONS_LAST_24_HRS` would return those untyped in prod (LATEST unaffected — config-driven). Also CSV has a duplicated glucose row (identical lines 749–750). Last-24-hrs path not live-testable (static patients have no fresh labs) — rely on OR-2436's staged unit tests.

**OR-2555 (QTc): VALIDATED, ticket Done 2026-07-16** — PR #4124 (draft) holds the tests; worktree teardown pending merge. QTc = `QTC_INTERVAL` filter inside `MayoGetLatestObservationsR4Command` (OID code 182003, unitless valueString, FINAL/AMENDED only); no separate command by design. New `MayoGetLatestObservationsR4CommandTest` (7 tests — OR-2436's staged tests should extend this file, and its pre-rework versions are stale vs the builder-based ObservationFilter) + `MFHIR-004/005`. Staging data verified live 2026-07-16: patient 11258334 QTc "519" effective 2026-05-26; patient 11201516 confirmed no resulted ECG (good negative-case patient). PR #4124 also carries the qa-suite CLAUDE.md gen-env doc fix as its own commit. Keeps `MFHIR-004/005` per Ryan's first-in-line ruling (see registry below).

**OR-2435 (Get Patient): ticket Done 2026-07-16**, validated live on dev (Jeremy Test PMRN 11279484 positive + unknown-PMRN negative with flip-and-revert red). Tests PR #4122 (draft, pending merge): `MayoGetPatientCommandTest` (3 unit) + `MFHIR-004/005`. Worktree OR-2435-FHIR-patient still open until merge. `.pending/OR-2435` dir still needs deleting (rm was permission-denied) + drop its row from the .pending README. Command drift since PR #3842: MRN/Epic-internal matched by identifier type text `MC`/`EXTERNAL`, mrnSystem from tenant config (3-arg constructor). Jeremy Test carries all four identifier flavours in staging.

**OR-2436 (Observations): ticket Done 2026-07-16**, validated live on dev via harness (Jeremy Test 11279484: BODY_HEIGHT cm + BODY_WEIGHT kg; unknown-PMRN negative flip-and-reverted red). Tests PR #4123 (draft, pending merge): 15 unit (`MayoGetLatestObservationsR4CommandTest` 7 + `MayoGetLaboratoryValuesR4CommandTest` 8, all 5 exclusion assertions seen red) + qa-suite `MFHIR-006..008` (renumbered — OR-2435's PR #4122 claims 004/005; second-to-merge hits a trivial spec-file conflict). Staged .pending tests were current except the lab-values constructor (main added 5th arg `observationSystem`). Worktree OR-2436-FHIR-observations open until merge; delete `.pending/OR-2436/` at post-merge cleanup.

**OR-2441 (Conditions): ticket Done 2026-07-16**, validated live on dev via harness (Douglas 11292545 → c-type-2-diabetes-mellitus via top-level code.text + c-chronic-kidney-disease via coding-display fallback ICD-10 N18.9 — both mapping paths seen live; unknown-PMRN negative flip-and-reverted red). Command unchanged on main since PR #3852. Tests PR #4125 (draft, pending merge): `MayoGetPatientConditionsR4CommandTest` (5 unit — staged exclusion tests were strengthened to stub a real mapping, otherwise deleting the ver-status guard stayed green) + qa-suite `MFHIR-009/010` (004–008 claimed by pending #4122/#4123). Worktree OR-2441-FHIR-conditions open until merge; `.pending/OR-2441/` deleted? NO — rm was permission-denied, still needs deleting + drop its row from the .pending README.

**OR-2537 (Admission Date): ticket Done 2026-07-16**, validated live on dev via harness (11201516 + 11279484 positive admission datetimes; 11291994 null-data negative with flip-and-revert red via the admitted patient; unknown-PMRN negative). Tests PR #4126 (draft, pending merge): `MayoGetAdmissionDateR4CommandTest` (8 unit, incl. both extension URLs + zoneless→Eastern fallback) + qa-suite `MFHIR-011..014` (renumbered from 004..007 after collision check). Worktree OR-2537-FHIR-get-admission-date open until merge. Facts: TST 11291994 (MRSA patient) has no in-progress encounter; Mayo GetPatient throws "Unable to find patient with pmrn: PatientId[value=…]" so the harness's generic "Patient not found for PMRN" fallback is MGB-only.

**OR-2538 (MRSA infection status): ticket Done 2026-07-16**, Jira comment posted. Validated live on dev via harness by Ryan (MFHIR run green): 11291994 → MRSA_INFECTION observations; 11201516 → empty (confirmed no infection Conditions — good negative patient); unknown PMRN → Mayo "Unable to find patient with pmrn" error. Can-it-fail done at unit level (polarity inversion 6 red; MRSA-filter removal red; reverted, command diff vs main empty). Tests PR #4127 (draft, pending merge): `MayoGetInfectionStatusR4CommandTest` (11 unit) + qa-suite `MFHIR-015..017` (initially 004..006, renumbered after the registry below surfaced). Command on main includes OR-2657 abatementTime follow-up (positive→onset, negative→abatement, fallback recordedDate; recordedDate element required). Worktree OR-2538-FHIR-get-infection-status open until merge.

**OR-2437 (Allergies): validated 2026-07-16, tests pending commit** on worktree OR-2437-FHIR-allergy. Positive path confirmed live (Phillip 11292542 penicillin → allergen `a-penicillin`, RxNorm 70618, INGREDIENT); negative unknown-PMRN confirmed (Mayo throws "Unable to find patient with pmrn"). **Defect found via MFHIR-019 (Wilfredo 11292547 hives): duplicate reaction rows in mayo `allergy-reaction-definitions.csv` (16 dup rows) + importer's DB-only dedupe → duplicate `allergy_reactions` rows → `findByReaction` throws → GET_ALLERGIES dies.** Same bug hit prod HL7 case scheduling → Sentry ticket **OR-2664 (Theo), fix in PR #4130** (CSV dedupe + in-batch importer dedupe + migration 204 with FK repoint, dup delete, unique constraint on reaction) — reviewed, covers everything; our duplicate product fix was reverted in favor of it. MFHIR-019 stays red until #4130 deploys, then confirms it e2e. Facts: `Allergy.getAllergenName()` capitalizesFully (JSON says "Penicillin"); PMRN 99999999 IS a real staging patient (use 00000000 as unknown); unmapped allergies (null `allergen`) are skipped by AllergyAssociationService → no med-allergy alerts, so the e2e asserts the mapping.

**MFHIR ID registry (authoritative — claim IDs here, keyed by ticket):** Ryan's ruling 2026-07-17: OR-2555/#4124 is first in line among the drafts and keeps the first free block after main; later sessions renumber, not it.
- `MFHIR-001..003` — OR-2557, PR #4090 (MERGED, on main)
- `MFHIR-004..005` — OR-2555, PR #4124 (first in line)
- `MFHIR-006..008` — OR-2436, PR #4123
- `MFHIR-009..010` — OR-2441, PR #4125
- `MFHIR-011..014` — OR-2537, PR #4126
- `MFHIR-015..017` — OR-2538, PR #4127
- `MFHIR-018..020` — OR-2437, worktree (PR pending; 019 red until OR-2664/#4130 deploys)
- `MFHIR-021..022` — OR-2435, PR #4122 ⚠️ session must renumber from 004/005 before merge (lost 004/005 to #4124)
- `MFHIR-023..024` — OR-2552, PR #4129 ⚠️ session must renumber from 004/005 before merge
- Next free: `MFHIR-025`

All drafts touch `mayo-fhir-commands.spec.ts`/`.md`, so later merges hit trivial textual conflicts but IDs are pre-deconflicted via this registry. check:tags can't see across branches — verify against this registry (and `gh pr diff` on siblings) before numbering.

**Tenant key: use `mayo-mayo`** (single-tenant collapse per Theo 7/9; key exists on main and works on dev — verified live 2026-07-16). The facility keys mayo-rosmc/mayo-rormc still exist but are being phased out; MFHIR spec already targets mayo-mayo.

**Conventions established:**
- qa-suite e2e family for Mayo FHIR commands = `MFHIR` prefix in `qa-suite/integrations/mayo-fhir-commands.spec.ts`, all `@supplemental` (live-Epic tests stay out of hermetic @core). `MAYO` prefix is taken by mayo-tenants.spec.ts.
- Harness calls need `X-Tenant-Id: mayo-rosmc` header (path var only picks the factory; schema resolves from header).
- `GET_PRACTITIONER` input is a **PERID** (person id), not PROVID/PMRN. Stable staging practitioners in `mayo-client-integration/integration-notes/practitioner_investigation.md`: Ann Testing PERID 20224753↔PROVID 1493154; Zzprovcmtesting PERID 60003855↔PROVID 44 (only one with email). Staging PractitionerRoles are location-only → role/specialties null.
- qa-suite runs vs dev: `./gen-env.sh` writes env-suffixed cred files; run via `npm run test:dev -- --project=integrations --grep "MFHIR-"`.

**Remaining tickets:** OR-2552 (Glucose), OR-2539 (MH family hx — FMH command now exists; rule also reads Conditions). Follow-on ticket drafts not yet in Jira: MGB FHIR e2e (probe mgb-mgh harness first, PMRN 30001006705) and Mayo HL7 inbound e2e (deterministic, POST fixtures to /api/integration/hl7).

Related: [[mayo-integration-testing]], [[feedback_validate_against_main]], [[feedback_validation_protocol]]
