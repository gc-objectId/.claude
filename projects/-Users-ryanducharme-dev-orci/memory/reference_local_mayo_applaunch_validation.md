---
name: reference_local_mayo_applaunch_validation
description: "How to drive a Mayo app-launch rule end-to-end on the local build — tenant, SIU/RAS injection, and the endpoint that bypasses Epic OAuth"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 02938cbf-9332-4b85-a16b-b11f3f1b6e5b
  modified: 2026-08-06T13:35:55.947Z
---

Driving a **Mayo** case through the local app (validating app-launch rules against real HL7).

**Which build to point at:** the 8080 app is `main`. To exercise an unmerged branch fix you need a second
instance from the worktree — see [[running-a-worktree-build-alongside-the-main-local-app]] for the 8081 commands.
This flow is **API-only** (the UI is blocked by Epic OAuth, below), so skip `-P package-webapp` and no Vite is
needed. JUnit tests never need a running app at all — a `main` rebuild is irrelevant to them.

- `application-local.yml` enables `tenants.mayo.enabled: true`; the local tenant key is **`mayo-mayo`**
  (selector also offers `demo-demo`, `demo-qa`, `mgb-mgh`, `mgb-icsnh`).
- The **app-launch UI is unusable locally** — `/app-launch?...` dies with "Epic OAuth is not enabled - keys not
  configured" because it refreshes the patient from Epic FHIR first. Call the rule endpoint directly instead:
  `POST /api/cds/app-launch/{pmrn}/{caseId}` with `X-Tenant-Id: mayo-mayo`, body `{"timeZone":"..."}`. Same
  controller the app uses; only the Epic patient refresh is skipped. (Route prefix is `/api/cds`, not `/api/rules`.)
- HL7 injection: admin UI at `/admin/hl7-messages` → Send Message (templates for ORU/RAS/SIU + raw), or
  `POST /api/admin/hl7-inbound-messages/send` — see [[reference_local_hl7_inject_auth]] for auth/XSRF.
- **SIU case-create silently no-ops without `AIL-3-2`** ("skipping non-surgical case"). The Send Message
  template omits AIL when its OR-location field is blank. Real-shaped value: `AIL|1||^RM OR 201 ROMB 01 515^^ROMBOR`.
  Procedure resolution works off the AIS name via `procedure-codes.csv` `NAME` rows (e.g.
  `DILATATION AND CURETTAGE` → `p-dilation-and-curettage`).
- SIU does **not** create an unknown patient — use an existing local Mayo patient (list via
  `GET /api/admin/patients`), otherwise app-launch 404s with `PatientNotFoundException`.
- Mayo oral doxycycline resolves by **ERX**, not NDC: `RXA-5 = 2625^...^ERX` (any non-NDC coding system in
  component 3) → `g-doxycycline`. `Importer.parse()` strips the quotes the CSVs wrap ERX ids in, so the stored
  id is bare `2625`. `RXR-1 = oral` (lowercase, case-sensitive) → `MedicationRoute.ORAL`.
- A preop admin timestamped before the case window gets `operation = null` (by design — `saveMedAdmin`
  tolerates it, and `Patient.medicationOrders` is patient-scoped so rules still see it). Consequence: it will
  **not** appear in `GET /api/admin/patients/{pmrn}/operations/{caseId}/medication-administrations`, which is
  operation-scoped. Also, if `Operation.startTime` is null nothing ever attaches, since
  `findOperationBasedOnStartTime` requires `op.startTime <= adminDate`.
