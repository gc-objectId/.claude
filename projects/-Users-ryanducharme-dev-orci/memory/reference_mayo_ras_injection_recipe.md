---
name: mayo-ras-med-admin-injection-recipe
description: "Recording a Mayo med administration locally via RAS HL7 — message shape, the +1h timestamp shift, and why the operation only attaches when the dose lands after case start"
metadata:
  node_type: memory
  type: reference
---

To get a real medication administration onto a local Mayo case, inject a RAS message — SQL-inserted rows do **not** work (see the caveat below). `POST /api/admin/hl7-inbound-messages/send`, body `{"rawMessage": "..."}`, header `X-Tenant-Id: mayo-mayo`; auth per [[reference_local_hl7_inject_auth]]. Model the message on `mayo-client-integration/src/test/resources/hl7/rormc-ras-acetaminophen.hl7`.

Minimum viable segments (CR-separated):
- `PID|||<pmrn>^^^MC^MC` — `extractPmrn` scans PID-3 repetitions for component 5 == `MC`. Exact `findByPmrn` match, and it creates a skeleton patient if absent, so an admin-API-created pmrn works.
- `RXA|0|1|<yyyyMMddHHmmss>||<erx>^<name>^ERX|1000|mg|||<perid>|<dept>|||||||||Given||<yyyyMMddHHmmss>` — RXA-20 must be `Given`; component 3 of RXA-5 being any non-NDC system routes it to the ERX lookup.
- `RXR|IV^intravenous` (or `oral^oral`). ERX ids come from `client_medication_mappings.client_medication_identifier` — e.g. `8442` → `m-vancomycin-iv`, `2625` → `g-doxycycline`.

**Two traps that cost a lot of time:**
1. **The parser shifts the wire timestamp forward an hour** (Mayo HL7 timezone coupling — see [[reference_mayo_hl7_test_tz_coupling]]). Pre-subtract an hour from the value you want stored.
2. **The operation attaches only when the dose lands at or after `operation.startTime`** (`findOperationBasedOnStartTime` requires `op.startTime <= adminDate`). A preop-timed dose persists with `operation_id = NULL`. Backdate the case (e.g. `now - 30m`) and target `start_time + 1 minute`.

Confirm resolution independent of persistence via `client_id_mapping_events` (external_value / internal_value / qualifier) — it records what every RXA-5 code mapped to even when nothing was saved.

**Caveat — what the rule can and cannot see.** `ScheduledRuleEngine` reads doses straight from `medicationAdministrationRepository`, so a scheduled redose reminder appears in `public.qrtz_triggers` (group `antibiotic-redose-reminder`) and its fire time is a clean observable for interval logic. But `EarlyAntibioticDoseRule` reads `context.getPatient().getBolusMedicationAdministrations()`, which walks the patient's medication-order aggregate — a hand-inserted order + administration never surfaced there even when well-formed and visible through the admin API, and neither did an HL7-ingested one on a local Mayo case. Unexplained; suspected to be the Epic-FHIR-backed patient context that isn't configured locally. Use the scheduled trigger, not the selection alert, to observe redose intervals locally.
