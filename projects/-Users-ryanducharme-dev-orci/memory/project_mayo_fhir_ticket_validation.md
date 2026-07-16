---
name: mayo-fhir-ticket-validation
description: "Per-ticket validation of Mayo FHIR command tickets (OR-2434 epic) — .pending staging area, MFHIR qa-suite family, OR-2557 done"
metadata: 
  node_type: memory
  type: project
  originSessionId: 60db3a7f-4d1f-47ac-8015-aaa66c56fc87
---

Validation of the Mayo FHIR command tickets under epic OR-2434, handled **one ticket per worktree per SOP** (Ryan's 2026-07-08 decision after an umbrella-branch approach got unwieldy).

**⚠️ Staged work lives at `~/dev/worktrees/.pending/`** — per-ticket unit tests + a reference e2e spec written in the OR-2557 session, waiting for their own worktrees. READ ITS README AT PICKUP: files are May-2026-era and main has moved (practitioner command was rewritten PROVID→PERID after they were written; infection-status + family-member-history commands now exist). Always diff the command under test against current main and check for an existing test on main before copying anything in.

**OR-2557 (Get Practitioner): CLOSED** — ticket Done 2026-07-09, PR #4090 merged 2026-07-16 (Jordan approved), worktree torn down. Tests on main: 4 unit edge cases in `MayoGetPractitionerR4CommandTest` + qa-suite `MFHIR-001..003`. Jordan raised no objection to harness-coupled live e2e in qa-suite — pattern is accepted; extend the MFHIR family for sibling tickets.

**Tenant key: use `mayo-mayo`** (single-tenant collapse per Theo 7/9; key exists on main and works on dev — verified live 2026-07-16). The facility keys mayo-rosmc/mayo-rormc still exist but are being phased out; MFHIR spec already targets mayo-mayo.

**Conventions established:**
- qa-suite e2e family for Mayo FHIR commands = `MFHIR` prefix in `qa-suite/integrations/mayo-fhir-commands.spec.ts`, all `@supplemental` (live-Epic tests stay out of hermetic @core). `MAYO` prefix is taken by mayo-tenants.spec.ts.
- Harness calls need `X-Tenant-Id: mayo-rosmc` header (path var only picks the factory; schema resolves from header).
- `GET_PRACTITIONER` input is a **PERID** (person id), not PROVID/PMRN. Stable staging practitioners in `mayo-client-integration/integration-notes/practitioner_investigation.md`: Ann Testing PERID 20224753↔PROVID 1493154; Zzprovcmtesting PERID 60003855↔PROVID 44 (only one with email). Staging PractitionerRoles are location-only → role/specialties null.
- qa-suite runs vs dev: `./gen-env.sh` writes env-suffixed cred files; run via `npm run test:dev -- --project=integrations --grep "MFHIR-"`.

**Remaining tickets:** OR-2435 (Patient), OR-2436 (Observations), OR-2437 (Allergies), OR-2441 (Conditions), OR-2537 (Admission Date), OR-2552 (Glucose), OR-2538 (MRSA — command now exists), OR-2539 (MH family hx — FMH command now exists; rule also reads Conditions), OR-2555 (QTc — recheck main). Follow-on ticket drafts not yet in Jira: MGB FHIR e2e (probe mgb-mgh harness first, PMRN 30001006705) and Mayo HL7 inbound e2e (deterministic, POST fixtures to /api/integration/hl7).

Related: [[mayo-integration-testing]], [[feedback_validate_against_main]], [[feedback_validation_protocol]]
