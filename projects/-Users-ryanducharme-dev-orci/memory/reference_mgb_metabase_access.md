---
name: reference_mgb_metabase_access
description: "How to query MGB's prod Metabase from a session — URL, VPN, API-over-fetch pattern, router timeout, the loose index scan trick, and the OR timing-event vocabulary Epic pushes to MGH"
metadata:
  node_type: memory
  type: reference
  originSessionId: 0d89b431-8ef8-4d35-aac6-69b933e10696
  modified: 2026-11-05T15:19:53.740Z
---

**URL:** `https://metabase-mgb-guidedor-prod.apps.prod-shared-aro-e2.partners.org/` — one database, `guidedor (PROD)`, id 2, schemas `demo-demo`, `mgb-icsnh`, `mgb-mgh`, `public`. Needs the **MGB VPN** (not the AWS one — the two are exclusive, so stage/dev RDS goes dark while it's on). Email/password login that Ryan enters himself; a Chrome tab that was opened before the VPN came up shows a stale error page until a new tab is created.

**Driving it:** skip the SQL editor UI. With Ryan logged in, `javascript_tool` on the tab can `fetch('/api/dataset', {method:'POST', body:{database:2, type:'native', native:{query}}})` and return rows as JSON. Fire slow queries into `window.__x = run(q).then(r => window.__xr = r)` and poll, because the extension's `Runtime.evaluate` times out at 45 s. The OpenShift router cuts a request at ~60 s and returns HTML, so anything scanning `mgb_event_notifications` (9.2M rows, indexes only on `(display_name, patient_id, time_generated)`, `(primary_entity_id, primary_entity_type, time_generated)`, `practitioner_id`) must hit an index. A recursive-CTE loose index scan on `display_name` (`min(display_name) WHERE display_name > prev`) returns the whole vocabulary (~6.3k names) in seconds.

**No non-prod MGB Metabase exists** (dev/test hostnames all 503). The MGB dev app is `https://guidedor-dev.partners.org` (Epic TST); its database is reachable only through that app's own debugger/admin endpoints. An MGB-format PMRN (`30001…`) that is absent from every AWS schema is an MGB test patient living there.

**OR timing-event vocabulary Epic pushes to MGH** (every distinct `OR_EVENT_NAME` ever received in prod, checked 2026-11-05): Anesthesia Start, Anesthesia Stop, Extubation, Incision Time, Induction, In Room, Out of Room, Procedure Closing, Procedure End, Procedure Start, Ready for Recovery, Stop Data Collection. Parenthesized variants are undo/delete events. `Procedure Closing` and `Ready for Recovery` arrive but have no `MghEventType`, so they're silently dropped. No clamp event has ever arrived, and no notification display name of any kind (flowsheet rows included) mentions clamp — see [[project_or3104_clamp_events_investigation]].
