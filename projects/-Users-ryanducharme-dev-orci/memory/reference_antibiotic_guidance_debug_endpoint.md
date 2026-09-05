---
name: reference_antibiotic_guidance_debug_endpoint
description: "Fastest way to read a case's antibiotic resolution outcome locally (admin antibiotic-candidates endpoint), how to stage each outcome on demo vs Mayo SIU, and the async-after-ACK trap on HL7 admin send"
metadata: 
  node_type: memory
  type: reference
  originSessionId: a4915909-91a5-45fe-b14b-1a5578f8fc98
  modified: 2026-09-04T16:34:39.661Z
---

`GET /api/admin/patients/{pmrn}/operations/{caseId}/antibiotic-candidates` (X-Tenant-Id) returns the
in-app debugger's view: `outcome`, `recommended[]`, `unmappedSourceProcedures[]`, `procedures[]`. It drops the
Redis-cached resolution first, so it always re-resolves — no cache-bump needed between flips. Works with the
admin session (node http + cookie jar) and with the qa-suite `X-API-Key` context; 404 until the case exists.

Staging each outcome:
- **Unconfigured / None / drug mixes** — demo admin `operations/create` accepts several `procedureTypes`;
  demo `p-hernia-repair` has no pathway, `p-gastro-uncomplicated` is None, `p-gastroduodenal` is CEFAZOLIN.
  Rules: `POST /api/admin/events/category-event` (PROCEDURE_START+INCISION_TIME) runs the no-antibiotic rule
  synchronously; `POST /api/cds/medication-selection/{pmrn}/{caseId}` `{medicationIdentifier:"m-cefazolin"}`
  runs selection rules and returns `results[].ruleId`. Abstain reasons: `/api/admin/rule/evaluations/not-fired`.
- **Unmapped** — needs `operations.source_procedure_mappings`, written only by the *resolving* lookup: Mayo
  SIU (AIS-3 text vs NAME codes, `mayo-mayo`) or the EMR client-id path at operation creation. Admin-created
  cases never record it and always resolve normally, so the unmapped gate cannot be staged on demo.
  Mayo: `CHOLECYSTECTOMY`→drug, `COLONOSCOPY`→None, `PANCREATECTOMY WHIPPLE STANDARD`→p-whipple (mapped,
  no pathway), any unknown string→unmapped. A later SIU *replaces* the record (latest message wins).

**Trap:** admin HL7 send returns `MSA|AA` before processing finishes (async dispatch) — a psql read right
after the POST can show an empty row while the debug endpoint moments later sees the record. Poll.

Local build gotchas hit this session: `mvn -o` fails when main bumped Spring Boot (parent POM absent from
~/.m2) and the audio-generator plugin's netty deps also resolve online only — refresh the CodeArtifact token
and drop `-o` for both `install` and `spring-boot:run`. Local DB is `orci` (not `postgres`) on 5432.

Related: [[reference_local_hl7_inject_auth]], [[reference_demo_tenant_applaunch_validation]],
[[reference_curl_blocked_use_node_http]], [[project_or2875_all_procedures_gate]].
