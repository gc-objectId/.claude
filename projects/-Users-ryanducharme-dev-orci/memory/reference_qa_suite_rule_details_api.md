---
name: reference_qa_suite_rule_details_api
description: "Browser-free qa-suite pattern: post an observation to fire an event rule, then assert its persisted details (EXPANDED_CALCULATION etc.) via getFiredRuleEvaluations"
metadata:
  node_type: memory
  type: reference
  originSessionId: bdd6914d-3e5c-4c83-ac8f-f2b363236a80
  modified: 2026-08-31T00:00:00.000Z
---

An event-based rule's output can be asserted in qa-suite **without a browser at all** — no `launchApp`, no `waitForCaseSubscription`, no WebSocket race. INS-008/INS-009 run in ~1s each this way, versus ~8s for the `triggerScheduledRulesForCase` UI tests in the same file.

Two facts make it work:

1. **`POST /api/admin/observations/patient/{pmrn}/case/{caseId}` fires the event itself.** For `type: "GLUCOSE"` the controller calls `eventService.handleEvent(...)` with `GLUCOSE_UPDATED` synchronously, using the observation's `effectiveTime` as the event date. No separate `triggerEvent` call is needed. Rules run in-transaction, so results are persisted by the time the POST returns.
2. **`getFiredRuleEvaluations` exposes the full `details` map.** `RuleFiredResultDTO` always carried `details`; the qa-suite `RuleFiredEvaluation` interface just hadn't declared it (added `details?: Record<string, unknown>`). So `details.EXPANDED_CALCULATION` — the exact "Show Calculation" string — is directly assertable.

Also note **the rule only needs the operation to *exist*, not to be launched** — `getOperation` resolves by caseId. An admin-created case is enough.

Shape that makes an absence assertion trustworthy: a **positive/negative pair** with identical staging differing in one field, both polling for the alert to actually fire before asserting on its text. The positive control is permanent, unlike a flip-and-revert done once. It earned its keep immediately here — it caught that the "positive" fixture didn't fire at all (see [[reference_egfr_adjustment_type1_only]]), which a lone `not.toContain` test would have passed straight through.

Poll rather than assert once, keying the poll on the alert having fired (`toContain("Show Calculation")`), so a non-firing rule fails loudly instead of yielding an empty string that satisfies an absence check.

Related: [[reference_egfr_adjustment_type1_only]], [[feedback_npm_script_test_commands]], [[feedback_validation_protocol]], [[reference_rule_definitions_rebuilt_on_boot]].
