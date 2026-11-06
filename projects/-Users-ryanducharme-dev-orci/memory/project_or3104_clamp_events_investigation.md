---
name: project_or3104_clamp_events_investigation
description: OR-3104 clamp on/off investigation (2026-11-05) — neither site sends clamp events today; where the evidence is and what reaching them would take
metadata:
  node_type: memory
  type: project
  originSessionId: 0d89b431-8ef8-4d35-aac6-69b933e10696
  modified: 2026-11-05T15:28:42.521Z
---

OR-3104 (Task, Alex, investigation for placeholder rule OR-3096: protamine alert when heparin given, clamp on, no clamp off). Investigated 2026-11-05 with Ryan.

**Finding: no clamp event reaches ORCI from either site, and nothing in the codebase handles one.**

- **MGH** — the complete `OR_EVENT_NAME` vocabulary ever pushed on `PHS EXT OR TIMING EVENT` (prod Metabase, loose index scan on `display_name`) has twelve names and no clamp; no notification display name of any kind mentions clamp. Getting it means MGB's Epic team adding the clamp OR event IDs to our event subscription, then adding them to `MghEventType`. The SOAP surgical record's `AnesthesiaEvents` array is read at case start and never persisted, so whether it carries clamp entries is unknown; a log line of its event names would answer it.
- **Mayo** — the SIU^S14 OBX vocabulary on stage `mayo-mayo` over 30 days (34 identifiers: 12 scheduling metadata + 22 timing names) has no clamp, and no message of any type in 7 days mentions clamp (ORU flowsheet included). Getting it means Rene adding the clamp events to the SIU timing-event build, then a `MayoEventType` alias.
- **Alex's test case** (MGB-format PMRN, case 32637, "renal clamp on 11:55") lives in the MGB dev app (Epic TST), absent from every AWS schema and from prod Metabase. Its empty debugger timeline matches the prod vocabulary: Epic never sent it.

**Side findings filed:** OR-3139 (MGH `Procedure Closing` / `Ready for Recovery` unmapped, dropped silently with no log; add WARN + catalogue) and OR-3140 (Mayo `End Care` / `Proc Close` / `Recov Cmp` trip the unrecognized-OBX WARN; add no-category aliases). Both linked to OR-3104, both To Do, unassigned.

**How to apply:** when a rule needs an intraop event, check the site's received vocabulary before designing — [[reference_mgb_metabase_access]] for MGH, the SIU OBX regexp over `hl7_inbound_messages` on stage for Mayo.
