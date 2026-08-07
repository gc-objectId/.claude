---
name: reference-demo-tenant-applaunch-validation
description: "How to drive a real case start locally with full control of patient/case inputs — demo tenant, admin API to stage, POST /api/app-launch to actually start"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b2316851-3433-41f5-ab26-841372a03a54
  modified: 2026-08-06T18:05:57.868Z
---

To validate anything that happens in `OperationService.startOperation` (case start), stage the case with the admin API and then start it with `POST /api/app-launch` — body `{"patientId": "<pmrn>", "caseId": "<caseId>"}`, header `X-Tenant-Id: demo-demo`.

**The trap:** `POST /api/admin/patients/{uuid}/operations/create` calls `saveOperation`, **not** `startOperation`. Staging a case that way and inspecting the DB produces a false negative for anything wired into case start. Same shape as the OR-2581 admin-endpoint trap — see [[project_or2581_compliance_casestop_wiring]] and [[reference_hl7_admin_send_validation_path]].

**Why the demo tenant works:** `DemoPatientService.loadExistingPatient` builds the EMR surgical record *from the existing operation row* whenever the pmrn does not match `patient-\d+` and a patient + operation already exist. So the admin-created case round-trips through the real EMR pull with no Epic dependency. Mayo tenants always hit real Epic FHIR (see [[reference_local_mayo_applaunch_validation]]).

Inputs and how to set each:
- age → patient `dob` on `POST /api/admin/patients/`
- procedure types → `operations/create` (the existing-operation branch of `startOperation` never re-derives them, so they stick)
- acuity → `PATCH .../operations/{caseId}/classification`; ASA → `.../asa-status`
- conditions → `POST .../conditions` (pick a condition id that already carries the tag you want); home meds → `POST .../medication-notes` with `codings: [{code, codeSystem}]`
- `scheduled_start_time` / `scheduled_end_time` have no admin endpoint — set them by SQL. Only Mayo's SIU populates them in production, and only on the first case-start message.

Auth is the same form-login + `XSRF-TOKEN`-cookie dance as [[reference_local_hl7_inject_auth]]. Relaunching the same case re-runs the whole path, which makes flip-and-revert cheap.

If the tenant lacks a procedure type you need (e.g. demo has no `p-pancreatectomy`), insert one row into `"<tenant>".procedure_types`; nothing else is required for identifier-gated logic.
