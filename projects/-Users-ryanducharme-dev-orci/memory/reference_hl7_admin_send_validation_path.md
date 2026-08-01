---
name: reference_hl7_admin_send_validation_path
description: "Methodology for manually validating an inbound Mayo HL7 ticket — why the admin send path is trustworthy, real fixture pairs, and proving a null result isn't a dropped message"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e7da2ca4-206f-486b-951e-a0f0304cba18
  modified: 2026-07-31T19:35:34.988Z
---

Methodology for validating an inbound Mayo HL7 ticket (SIU/ORU/RAS). For the mechanics of actually injecting a message (endpoint, form login, CSRF quirk, local DB creds) see [[reference-local-hl7-inject-auth]].

**The admin send path is trustworthy.** `processMessageForAdmin(raw)` is just `processTenantMessage(raw, null)` — identical to the live integration endpoint apart from `apiTokenId`. So findings here are *not* the non-representative-tooling false negative that burned OR-2581 (see [[project_or2581_compliance_casestop_wiring]]). Worth re-confirming the equivalence if `HL7InboundService` changes; don't generalize it to other admin endpoints.

**UI alternative to scripting it:** `/admin/hl7-messages` → select tenant → *Send Message* → Template = **Raw Message** → editable textarea (paste with newlines; the page converts to CR). Avoids the CSRF/login dance entirely. Claude can't log in itself (passwords), so ask Ryan to log in first. Caveat: the built-in non-raw templates can be stale relative to the processor — the SIU ones were silently dead for weeks (OR-2705).

**Use the repo's real captured Epic messages, not hand-authored ones:** `mayo-client-integration/src/test/resources/hl7/`. They frequently come in natural positive/negative pairs for the same case — e.g. `rosmc-siu-s14-timing-in-room.hl7` vs `...-proc-finish.hl7` carry an identical booked slot with different `ZCS`/OBX events. Rewrite caseId + PMRN per scenario (fake PMRNs `99xxxxxx`; real Mayo TST are `11xxxxxx`) so scenarios don't collide through first-wins guards.

**Prove a null result isn't a dropped message.** This is what makes an absence assertion mean anything, and it's stronger than the generic flip-and-revert:
- assert a *different* field the same message should still set (Proc Finish sets `procedureEndTime` while the scheduled window stays null); and/or
- change a non-guarded field in a resend (the `AIL` room) so a first-wins field staying put is provably not a silently skipped message.

Processing is **async after the ACK** — wait ~3-5s before querying.

**Timestamp gotcha:** HL7 stamps parse as America/Chicago, then bind in the **JVM default zone** into `timestamp without time zone` (`hibernate.jdbc.time_zone` is a dead key — see the comment in `application.yml`). On an EDT machine 11:05 Chicago reads back as 12:05: correct instant, shifted wall clock, not a bug. See [[reference_mayo_hl7_test_tz_coupling]].
