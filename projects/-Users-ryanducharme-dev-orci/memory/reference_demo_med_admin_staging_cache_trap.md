---
name: reference_demo_med_admin_staging_cache_trap
description: Staging a medication administration on the demo tenant for notification rules — user endpoint 500s, simulation endpoints hard-code MGH, SQL rows are hidden by the Redis ContextPatient cache until evicted
metadata:
  type: reference
---

To make a PROCEDURE_START (or any notification) rule see an antibiotic as "given" on `demo-demo` locally:

- `POST /api/patient/{pmrn}/{caseId}/medication-administration` (the real UI path) needs `trackingTabId`
  from `POST /api/cds/medication-selection/{pmrn}/{caseId}` (`trackingTabId` in the response), and then
  **500s with "Unable to send EMR medication administration"** — the MGB HL7 writer runs for demo and
  the whole `@Transactional` rolls back. `/api/simulation/**/simulate-med-admin*` hard-code
  `TenantKey.MGH`. Neither works for demo.
- What works: insert a `medication_orders` row (`medication_administration_type='BOLUS'`,
  `ordering_provider_specialties='[]'`) and a `medication_administrations` row pointing at it
  (`medication_id` of the demo medication, `route='INTRAVENOUS'`, `source_type='APPLICATION'`,
  `codings='[]'`, `concentrations='[]'` — a null `concentrations` NPEs in `PatientCacheService.serializePatient`).
  `Patient.getMedicationAdministrations()` walks `medicationOrders`, so a row without an order is invisible.
- **Then evict the cache.** `PatientService.toContextPatient` returns the Redis-cached `ContextPatient`
  when present, and `POST /api/app-launch` populates it, so rows inserted after launch are ignored by the
  rules until `patients/<tenant>/<pmrn>` is deleted (`redis-cli -a <pass> del ...`; the loop's Valkey
  password is in `~/.claude/jira-watch/compose-loop.yml`). Check with
  `GET /api/admin/patients/{pmrn}/operations/{caseId}/medication-administrations` before firing the event.
- Fire the event with `POST /api/admin/events/category-event` (see [[reference_local_guidance_fanout_validation]]);
  rule lockouts are per rule per case, so use a fresh case per scenario rather than re-firing.

Related: [[reference_demo_tenant_applaunch_validation]], [[reference_antibiotic_guidance_debug_endpoint]].
