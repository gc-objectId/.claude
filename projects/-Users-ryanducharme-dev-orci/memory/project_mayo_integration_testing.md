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

**Session 1 (Thu 2026-07-02) results:** Douglas case (OR 108, ORS): identity/demographics PASS; T2DM+renal conditions PASS; POC glucose 80 PASS (but arrived as TWO rows — dup-watch Q17); TOF PASS; blood transfusion = **flowsheet observation, not med admin** (transport confirmed; product-identification mapping gap — Q14, Mayo Sherlock follow-up, only emergency products documentable in TST). **No EVN on SIU/labs** — Mayo adding **Z-segment w/ triggering-user ID+name** (Q15, Rene confirming; needs our parsing work). RXT/barcode = phase 2; RAS NDC+ERX sufficient (Q16). Procedure mappings still not loaded (Q12 defer confirmed live). TST flowsheet EVN shows model-user alias — resolves in prod (MGH precedent). Sessions 2+3: Wed 2026-07-08 (time TBD) and Thu 2026-07-09 (90 min); Brit pre-ordering glucose/K/creatinine via SoftLab (lab-order path). Tracker snapshot loop established: Ryan downloads OneDrive copy (dated filename) → Claude edits in place w/ openpyxl → Ryan re-uploads (⚠ threaded comments don't round-trip). Async sheet = 18 rows incl. 3 second-route variants (ondansetron IM, hydrocortisone IM, lidocaine epidural 5 mL).

**Session 2 (Wed 2026-07-08):** 🔴 **Facility misattribution bug (Q20)** — patient registered at St. Mary's, case at Methodist: SIU routed correctly but **RAS+ORU stamped ROSMC** (Epic uses registration facility, not case location) → wrong tenant, silently. Real-world scenario. Fix direction: PMRN→operation routing (ties to existing backlog) or Epic adds dept metadata (Rene). PASS: PROC-1 procedure mapping, case start, a-preop-glucose re-fire, SIU timing at Methodist, glucose/creatinine/EBL arrived (wrong tenant). Q7 ANSWERED: pediatric = <18 AND <40kg → Phillip (14yo/50kg) technically adult — confirm before unblocking. New Qs 20–26 in runbook (ASA missing, MRSA=culture-result-not-flag needs recency window, case-classification mapping, obs typing, induction TST build backed out; nurses: Procedure Start = incision).

**Next up:** (1) 7/9 90-min session: SoftLab lab path, Brit's Methodist-only clean patient, remaining 7/9 agenda. (2) Binary xlsx/docx artifacts REMOVED from repo — OneDrive only; Claude gives paste-ready text (bulk: download→edit→re-upload). (3) Mayo docs live in worktree `~/dev/worktrees/mayo-integration-testing` (orci dir back on main). (4) Rene PTO 7/20–23, Brit funeral leave upcoming — schedule aggressively.

Related: [[feedback_validate_against_main]]
