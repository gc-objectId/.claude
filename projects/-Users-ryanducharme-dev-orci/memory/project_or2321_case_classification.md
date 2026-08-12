---
name: project_or2321_case_classification
description: "OR-2321 acuity fallback — DONE; the two interaction bugs review caught, and where the acuity decision lives now"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1998602b-3603-4890-be21-fd3cc54c3ad2
  modified: 2026-08-12T13:11:48.867Z
---

OR-2321 **DONE** (merged 2026-08-12, PR #4343). Antibiotic candidates are scoped by `Qualifier` OR `Case Classification`, mutually exclusive per CSV row. Only Mayo `p-cesarean-delivery` uses classification: 4 rows → **6** records, because the importer splits `urgent | emergent` into one record per acuity, ranks 0 and 1 per tier.

The fix: when a case's acuity selects no row, keep the full set instead of narrowing to empty — narrowing to empty made the rule abstain on "No preferred antibiotics" and silently suppressed the alert (a semi-urgent cesarean got nothing). Lives in `classificationNarrows` / `narrowToClassification`.

**Two interaction bugs review caught in that fallback — check both when touching it:**
1. Decide the fallback on *the rows the procedure offers* (qualifier-scoped), not all rows. A sibling qualifier's row answering for the acuity leaves the preferred tier empty against a protocol still showing groups → renders as ALL_CONTRAINDICATED on a case where nothing was ruled out.
2. **NONE rows must count** in "did the acuity select something". They carry qualifier + classification scoping now (the importer was changed — older notes saying NONE rows drop their scope are wrong). Excluding them let another acuity's candidate fall back over a procedure that had already answered, filling its candidate list and disqualifying it from `noProphylaxisProcedures` (which requires `candidates().isEmpty()`) — a case configured to need no antibiotic asked for one.

**Do not** fix acuity gaps by dropping the `SemiUrg`/`NonUrg` mapping in `CaseClassification.fromClientValue`. `NON_URGENT` is load-bearing: a Mayo HL7 test asserts real `|Non-Urg|` PV1-4 normalizes to it, MGB's SOAP feed maps it, `ProcedureRiskService` consumes it, the In-App Debugger exposes it.

**How to apply:** model the real 6-record shape and drive all four enum values plus null — single-rank-per-acuity data hides the display bug, and data without NONE rows hides bug 2. See [[feedback_validation_protocol]] and [[reference_antibiotic_candidate_sources]].
