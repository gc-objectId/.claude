---
name: reference_default_dose_compliance_api_validation
description: "Browser-free recipe to validate default-dose compliance verdicts end to end on a local build: admin session → stage demo patient → /api/cds/medication-selection → tracked administration → /api/admin/rule/evaluations/fired"
metadata:
  node_type: memory
  type: reference
  originSessionId: f0db63ab-c013-44d6-ac8e-5774b4647ac2
  modified: 2026-11-05T14:31:38.811Z
---

Default-dose compliance can be validated through the real path with no browser. Script lives at
`scratchpad/dose-compliance.js` in the OR-3132 review session; rebuild from these facts if it is gone.

1. Form-login as `admin`/`admin` to `/api/login/basic` after `GET /csrf`; send the `XSRF-TOKEN` cookie value
   in `X-XSRF-TOKEN`. Every call carries `X-Tenant-Id: demo-demo`. Admin (`allowed_tenants` empty) is accepted
   on the user endpoints too.
2. `POST /api/admin/patients/` (`weight: "75 kg"`, `dob`) → `POST /api/admin/patients/{uuid}/operations/create`
   → `POST /api/app-launch {patientId, caseId, forceLaunch: true}` (forceLaunch clears the pediatric gate).
3. `POST /api/cds/medication-selection/{pmrn}/{caseId} {medicationIdentifier, timeZone}` runs the selection
   rules and returns `dosingFormState.trackingTabId` plus the shown default (`defaultOption: true` in
   `perRouteState.<ROUTE>.doseOptions`).
4. `POST /api/patient/{pmrn}/{caseId}/medication-administration` with that `trackingTabId`, the med's default
   `ndc`, `doseAmount`, `doseUnits`, `route: "INTRAVENOUS"`, `concentrations: []`, and the split admin date
   fields. The controller's `afterCommit` runs `evaluateComplianceOnMedicationAdministration`.
5. `GET /api/admin/rule/evaluations/fired?caseId=..&ruleIdentifier=..` → `complianceResults[].compliant`.

Why this is the real path: compliance always re-reads the firing from the database (by tracking id), so any
`@JsonIgnore` field on the stored `DoseOptionDTO` is invisible to the verdict. That is why main's "one rounding
step" band never applied in practice and every weight-based default needed an exact match.

Good fixtures in demo: dantrolene adult (`m-dantrolene`, NDC 2750500367, 2.5 mg/kg, 10 mg step → 190 mg at
75 kg) and pediatric fentanyl (`m-fentanyl`, NDC 6332380605, 1 mcg/kg, no step → 20 mcg at 20 kg, age 5).

Related: [[reference_curl_blocked_use_node_http]], [[reference_demo_tenant_applaunch_validation]],
[[reference_devtools_restart_on_mvn_test]] (a flip-and-revert `mvn test` in the same worktree restarts the
8082 JVM onto whatever target/classes holds; a failed `-pl orci` compile leaves it empty).
