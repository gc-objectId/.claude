---
name: reference_insulin_dose_isc_validation_surface
description: "Admin endpoints that expose the home-insulin daily dose trace and re-run the ISC calculation, for validating insulin dosing changes end-to-end locally"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 595dbeed-ca2e-4364-ad19-8ac2b59a9b40
  modified: 2026-08-14T19:29:19.841Z
---

Two admin endpoints make insulin daily-dose / coefficient work fully validatable on a local build, no case workflow needed:

- `GET /api/admin/patients/{pmrn}/insulin-daily-dose` — returns `home` and `medAdmin` calculations **including `InsulinCalculator`'s full `trace` list**, `individualDoses`, `totalDailyDose`, `hasInsulinButCalculationFailed`. The trace names each note by id and states which branch computed it, so it reads like a debugger on the calculation.
- `POST /api/admin/patients/{pmrn}/operations/{caseId}/isc/initialize` — calls `handleCaseStart(..., forceReinitialization=true)`, so it can be re-run repeatedly; each call appends a new `tracked_values` row of type `ISC`. Read the result straight from `tracked_values`.

Together these give a flip-and-revert loop: mutate a `medication_notes` row with SQL, re-read the dose trace, re-initialize, watch the coefficient move. `InsulinCalculator` queries `MedicationNoteRepository` directly (no patient cache), so raw DB edits are visible immediately.

Good local fixture: **demo-demo** patient `patient-2` (Megtwo Periop, 83 kg) already carries seeded insulin notes — NovoLog 10 units q8h = 30 units/day, plus an as-needed note that is correctly excluded. Weight 83 kg makes the 1 unit/kg/day threshold easy to straddle. Its baseline ISC is 0.005, which means the T1-or-eGFR branch is true, so crossing the threshold moves it to 0.01.

**Strategy split that shapes what a fix actually affects:** `InsulinManagementService.selectStrategy()` returns `mayoStrategy` for `TenantKey.Org.MAYO`, `defaultStrategy` otherwise, with no flag. Only the **default** strategy's initial coefficient consults the daily-dose threshold (0.02/0.01/0.005 branch). Mayo's initial value is diabetes-type-only (0.01 / 0.03) and `MayoISCCalculator` takes no daily-dose input at all — so for Mayo tenants a daily-dose change surfaces only in `AdjustInsulinInfusionRateRule`'s "Show Calculation" text. Check the strategy before claiming a dosing change moves Mayo's coefficient.

**Determining a JSON column's serialization shape:** compile a throwaway class against the running app's own classpath (`ps -o command= -p <pid>` → grab the `-cp` value) and call `new CustomObjectMapperSupplier().get()`. That supplier does *not* disable `WRITE_DATES_AS_TIMESTAMPS`, so `List<LocalTime>` persists as `[[8,0],[12,0],[17,0]]`, not ISO strings — though the deserializer accepts both. Beats guessing at Jackson defaults when hand-writing rows.

Related: [[reference_local_hl7_inject_auth]] (auth/XSRF for these admin calls), [[reference_curl_blocked_use_node_http]], [[reference_run_worktree_app_second_port]], [[feedback_validation_protocol]].
