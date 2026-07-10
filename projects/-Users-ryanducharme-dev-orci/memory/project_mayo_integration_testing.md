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

**Session 3 (Thu 2026-07-09):** PASS: C4-3/4/6/7 (Out Room closed case, 11s latency; Proc Close + In Recov arrive but UNMATCHED — abbreviated-alias gap, our fix), C2-bolus at Methodist w/ PERID clinician, re-registration fixed routing (Douglas + Agustina readmitted Methodist). FAIL: 5.3-edit (duplicates — edit = re-sent 'Given' same RXA-2+time; fix = reconcile by order+RXA-2), 5.4-cancel (RXA-20 word 'Canceled' vs our 'D' check), C1-lab + C5-ebl + ORU-rormc (NO ORU has EVER hit Methodist tenant; Rene saw 'not send' flag). BLOCKED: C4-1/2/5 (TST rollback of OR-timing build — Rene chasing redeploy), ASA (not in FHIR obs; homegrown tool → smart-text on ORL log; custom segment/log pull — Rene). Multi-procedure: scheduled panels send both AIS ✓; ad-hoc adds 'first one wins'; can't edit procedures (cancel+relist). RXA-21 action code empty (spec says copy — Rene). **Theo decisions (7/9 Slack): collapse Mayo into a SINGLE TENANT + facility attribute on operation** (kills MSH-4 routing problem); debug EBL drop; support RXA-2 admin identifiers; troubleshoot multi-proc mapping. Pediatric criterion confirmed <18 AND <40kg (Phillip technically adult — pending Theo).

**Next up:** (1) **Session 7/10: FHIR-focused** — allergies, conditions, observations + infusions; Ryan owes a prep sheet of scenarios. (2) Tracker backfilled 7/9 by Claude (Master + dated sheets) → Ryan re-uploads. Binary artifacts stay OneDrive-only. (3) Mayo docs in worktree `~/dev/worktrees/mayo-integration-testing`. (4) Guided hosts future meetings (Mayo can't share Teams recordings); Brit sends transcripts. (5) Rene PTO 7/20–23, Brit funeral leave upcoming.

Related: [[feedback_validate_against_main]]
