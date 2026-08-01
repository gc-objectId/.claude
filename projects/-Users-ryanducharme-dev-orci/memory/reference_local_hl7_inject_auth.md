---
name: reference-local-hl7-inject-auth
description: "How to script HL7 message injection into the locally running app (admin endpoint, form login, CSRF quirk) for manual validation"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 9c53c91d-1fdf-491f-b57f-ea4f0f88a76c
  modified: 2026-07-31T19:35:37.995Z
---

To replay HL7 messages against the locally running app (the scripted equivalent of the In-App Debugger's Send Message tab), POST to `/api/admin/hl7-inbound-messages/send` with `{"rawMessage": "..."}` and header `X-Tenant-Id: <tenant-schema>` (e.g. `mayo-mayo`). It processes the message exactly as the integration endpoint would, in the header's tenant — no facility re-routing.

Auth gotchas that cost time:

- **httpBasic does NOT work here.** It's scoped to `/api/integration/hl7/**` only (API-token chain). `/api/admin/**` needs a ROLE_ADMIN *session*.
- **Form login**: POST `username=admin&password=admin` (form-urlencoded) to `/api/login/basic`. Local admin password comes from `admin.password` in application.yml.
- **CSRF**: `SpaCsrfTokenRequestHandler` resolves a header-supplied token as *raw*, so send the **`XSRF-TOKEN` cookie value** in `X-XSRF-TOKEN` — NOT the XOR-masked `token` from `GET /csrf`'s JSON body. Sending the JSON token 403s. Prime the session with `GET /csrf` first and keep a cookie jar.
- The `/api/integration/hl7` route needs a valid `ORCI:T:` tenant token (basic auth: username = tenant key). Local DB usually has none for Mayo, hence the admin route.

Local DB is `orci`/`orci` on localhost:5432 in the `postgres` docker container; tenant schemas are quoted (`set search_path to "mayo-mayo"`). Patients are auto-created from PID as skeletons, so no seeding needed — but the medication NDC mapping must already exist in that tenant.

A no-auth alternative when a human is present: drive the `/admin/hl7-messages` → Send Message → **Raw Message** textarea in the browser instead of scripting it.

Related: [[reference_hl7_admin_send_validation_path]] (what to actually assert once you can inject), [[feedback-validation-protocol]], [[feedback-validate-against-main]].
