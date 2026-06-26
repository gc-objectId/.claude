---
name: project_or2581_compliance_casestop_wiring
description: "OR-2581 ERAS antiemetics compliance — suspected case-stop re-eval wiring gap, verifying in TST"
metadata: 
  node_type: memory
  type: project
  originSessionId: 62523547-d3ae-41e9-9531-0dad00918394
---

OR-2581: ERAS antiemetics firing should flip SILENT non-compliant → compliant when a 2nd antiemetic class is documented after the alert but before anesthesia stop. The re-eval logic (`ErasAntiemeticsComplianceEvaluator` + `RuleComplianceService.evaluateComplianceForCaseOnStop`) is correct in isolation and unit-tested.

**Suspected gap (found 2026-06-24, not yet confirmed):** manual local validation against the `main` build did NOT flip the record after `CLOSE_APP`. Two case-stop handlers exist:
- `EventService.handleCaseStop` (EventService.java:170) — DOES call `evaluateComplianceForCaseOnStop`; only reachable via `handleEvent(CaseStopEvent)`.
- `RuleEngineService.handleCaseStop` (RuleEngineService.java:221) — the path `CLOSE_APP` actually hits (via `executeNotificationRules:180`); only stops the operation + sends notification, NO re-eval.

Nothing dispatches a `CaseStopEvent` into `EventService.handleEvent` (the only one constructed, RuleEngineService:183, goes to RuleEngineService's own handler). So `evaluateComplianceForCaseOnStop` looks like dead code in prod — would affect all 4 categories it covers (med-administered/MRSA, not-administered, antibiotic-redose, ERAS antiemetics). There's a `// TODO revisit why we don't see this event` on the CLOSE_APP branch.

**Why not certain:** unit/integration tests (incl. the `ErasAntiemeticsCaseStopComplianceTest` I added) call `evaluateComplianceForCaseOnStop` directly, so they pass and mask any wiring gap. Theo (author, OR-2451/OR-2201) wasn't sure either.

**Decision:** verify end-to-end in TST — run the real ERAS workflow, document 2nd antiemetic before close, then check if compliance flips. Cleanest signal: tail TST logs for `"Evaluating compliance for case stop"` / `"Found N rule firings to evaluate at case stop"` after CLOSE_APP — if absent, re-eval isn't invoked. Ryan driving this in a TST session with Alex (~2026-06-25). Also check the MRSA/med-administered case since same path.

Local repro data left in `demo-demo`: patients/ops `OR2581POS` / `OR2581NEG`. Admin API auth = USER token via `X-API-Key`; tenant via `X-Tenant-Id` header; local DB reachable as orci/orci on localhost:5432. Compliance verdict only surfaces in `compliance_results` / admin `GET /api/admin/rule/evaluations/fired`, not the clinician UI. SILENT can't be produced via UI (logged-in user forces INTERACTIVE).
