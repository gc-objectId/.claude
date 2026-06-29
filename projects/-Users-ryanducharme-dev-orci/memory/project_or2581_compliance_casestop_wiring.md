---
name: project_or2581_compliance_casestop_wiring
description: "OR-2581 ERAS antiemetics compliance — VALIDATED in real Epic TST flow, no gap"
metadata: 
  node_type: memory
  type: project
  originSessionId: 62523547-d3ae-41e9-9531-0dad00918394
---

OR-2581: ERAS antiemetics firing should flip non-compliant → compliant when a 2nd antiemetic class is documented after the alert but before anesthesia stop.

**RESOLVED (2026-06-26): validated, works on main.** Ryan ran the real Epic TST → Guided integration flow (hysterectomy ERAS case) and has screenshots of the same firing showing non-compliant, then flipping to compliant a couple minutes after he documented a 2nd antiemetic class post-procedure-stop. It would not have changed without that 2nd med — so it's a genuine re-eval, not a default. Positive + can-it-fail both confirmed. No code fix needed.

**Earlier false alarm (corrected):** my local manual repro used the admin endpoint `POST /api/admin/events/category-event` with `CLOSE_APP`, which routes through `RuleEngineService.handleCaseStop` (stops op + notifies, NO re-eval) rather than the real integration path. So it was a false negative from non-representative tooling, not a prod gap. (Static analysis still shows `evaluateComplianceForCaseOnStop` has one real caller, `EventService.handleCaseStop:170`, reachable only via `handleEvent(CaseStopEvent)`, and nothing constructs a CaseStopEvent for handleEvent — so the actual real-flow flip trigger is most likely the **medication-administration re-eval** (`evaluateComplianceOnMedicationAdministration`) firing once the op was closed, not the case-stop path. Outcome correct either way; exact trigger not formally confirmed.)

**Gotcha for any future manual test:** a case is only ERAS (`erasOperation=true`) when started through the real case-launch/event flow (orci `OperationService:169` derives it from the surgical record's HYSTERECTOMY procedure code). The admin `createOperation` endpoint does NOT set it. ERAS antiemetics rule short-circuits ("Not ERAS operation") otherwise. Drive via Epic (real flow) or flip `eras_operation` in DB.

Untracked artifact on branch feature/OR-2581-antiemetic-admin-compliance: `orci/src/test/java/com/guided/orci/services/ErasAntiemeticsCaseStopComplianceTest.java` (@SpringBootTest; tests evaluateComplianceForCaseOnStop updates the row in place). Largely redundant with existing ErasAntiemeticsComplianceEvaluatorTest + RuleComplianceServiceTest. Pending keep-or-drop decision before worktree-done.
