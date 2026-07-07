---
name: mayo-integration-testing
description: "Mayo integration testing effort — artifacts, decisions, gaps, and session status (first session 2026-07-02)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6d565968-a517-42f0-9297-219a5abfd3eb
---

Ongoing Mayo ↔ GuidedOR integration testing (new HL7-push model: SIU timing, RAS med admins, ORU labs/flowsheet; FHIR pull at case start).

**Artifacts (untracked in ~/dev/orci as of 2026-07-07; plan: commit to a mayo-integration-testing branch):**
- `mayo-integration-test-plan.md` — INTERNAL runbook: run script (Runs 1–8 incl. 4B new-patient, 4C St. Mary's, 5.2a–c infusion lifecycle), §6 rule scenarios, §9 open questions Q1–Q13
- `mayo-validation-queries.sql` — IntelliJ console queries A (data+identity), B (rules fired), B2 (not fired), C/C2 (bolus/infusion), D (case+timing); GUC `my.pmrn` + `search_path` per tenant
- `mayo-integration-session-runbook.md`/`.docx` — client-facing; live copy is Theo's (Google Docs/OneDrive) — do NOT regenerate
- `mayo-test-tracker.xlsx` — live session tracker; **source of truth is the OneDrive copy** (Ryan pastes my field-by-field row text manually). Build script was at /tmp/build_tracker.py (diverged; local copy lacks St. Mary's + infusion rows)

**Key decisions/terminology:** "case start" not "launch" (In Room or Anesthesia Start; DB trigger value still `LAUNCH`). Verify identity (name/DOB/sex/MRN) + case ID/service at case start, not just MRN. Facilities: Methodist=`mayo-rormc` (all existing samples), St. Mary's=`mayo-rosmc` (routing test FAC-rosmc). Pediatric unsupported — P1 Phillip (14yo) blocked. Sample patients P1–P5 MRNs 11-292-542/3/4/5/7.

**Known gaps (internal runbook §9):** Q9 med-admin edit path unconfirmed (may duplicate; time-edit orphans cancel match); Q10 order ID not persisted by RAS; Q11 sux-rule condition tags missing from samples; Q12 procedure→X mappings NOT loaded (defer `a-known-procedure-wrong-antibiotic`; Proc-dep? column in tracker); Q13 infusion stop/pause/restart unmapped (only "RateChange"→RATE_CHANGE, else START) + infusion cancel only matches bolus table.

**Status (as of 2026-07-07):** First live session Thu 2026-07-02 — went well, fewer scenarios than hoped; results live in OneDrive tracker + transcript (Ryan to provide). Corrections from Theo: blood transfusion arrives via **flowsheet (ORU), not med admin** — separate flowsheet test (clarify which tracker row when transcript arrives). New med-admin test to add: **custom NDC (888*) via RAS**.

**Next up:** (1) NEW minimal async spreadsheet for Mayo (Brit) to run in TST without a meeting: one patient, top 15 meds w/ exact doses/routes, blank column for admin time — waiting on Ryan's Metabase top-15 query results (Alex sent query). (2) Fold session results + new rows into tracker. (3) Stage DB connection: duplicate aws-dev data source, host `guidedor-stage-aurora-postgres.cluster-ccyd1uvufmc7.us-east-2.rds.amazonaws.com:5432/orci`.

Related: [[feedback_validate_against_main]]
