---
name: reference-local-guidance-fanout-validation
description: "How to drive real Redis guidance fan-out on a local build — which trigger actually publishes, and which ones look right but never reach GuidanceService"
metadata: 
  node_type: memory
  type: reference
  originSessionId: fcf9ea50-bf86-4d45-a55d-a88b2a19ec62
  modified: 2026-08-14T19:16:02.057Z
---

To exercise `GuidanceService.sendGuidance` → Redis → `RedisMessageListenerAdapter` end-to-end locally (demo tenant), post a category event:

`POST /api/admin/events/category-event`, header `X-Tenant-Id: demo-demo`, body
`{"sourceEventType":"manual","eventCategories":["INDUCTION_START"],"patientId":"<pmrn>","caseId":"<caseId>","date":"<iso>"}`

`EventService` handles it, the rule engine runs, and guidance publishes. Both sides land in one log: `GuidanceService: Published to guidance` (DEBUG) then `RedisMessageListenerAdapter: Received guidance from channel: demo-demo/guidance`. Start the case first with `POST /api/app-launch` (see [[reference_demo_tenant_applaunch_validation]]).

**Two triggers that look right and are not:**
- `POST /api/simulation/{pmrn}/{caseId}/create-alert` 500s before it ever calls `sendGuidance` — `RuleFiredResult` references a transient `RuleExecutionContext`. Pre-existing, unrelated to whatever you are validating.
- `POST /api/app-launch` returns its alerts in the HTTP response. Nothing goes over Redis, so the listener never fires.

**CSRF quirk beyond [[reference_local_hl7_inject_auth]]:** form login rotates `XSRF-TOKEN`, and the rotated cookie is not enough for `/api/admin/**` — re-issue `GET /csrf` *after* login and send that cookie value. Skipping it 403s silently with nothing in the app log. `/api/simulation/**` and `/api/app-launch` accept the pre-login token, which makes the failure look endpoint-specific.

Publishing to the channel with `redis-cli` instead is a dead end: the app is not connected to the host-published `redis` container (`PUBSUB NUMPAT` returns 0), so `PUBLISH` reaches no subscriber.
