---
name: pushed-alert-tests-fail-together
description: "qa-suite tests waiting on websocket-pushed alerts (ARD-001, INS-004, MISC-001, PABX-013) all timing out at once = dead STOMP socket; check the ERROR frame and RECENTLY_ADMINISTERED_MEDS"
metadata:
  node_type: memory
  type: reference
  originSessionId: fe938377-464d-4fef-812a-419d58f07f61
  modified: 2026-11-10T19:47:00.865Z
---

When every qa-suite test that waits for a *pushed* alert (scheduled or event rule) times out in `expectAlert` while selection alerts still pass, the guidance socket is dead, not the rules.

Seen 2026-11-10 on dev (three red runs, [[or3179-qa-report-failure-history]]): with `RECENTLY_ADMINISTERED_MEDS` on, `RecentlyAdministeredMeds.tsx` subscribes to `admin/notifications/{tenant}/{patient}`. `SubscriptionInterceptor` requires ROLE_ADMIN for that destination, the tenant QA user lacks it, the STOMP ERROR frame closes the whole socket, and the `guidance/...` subscription dies with it. The client then reconnect-loops.

**How to apply:**
- Fast proof: a throwaway spec logging `page.on("websocket")` frames after `launchApp` — look for `ERROR message:Failed to send message to ... clientInboundChannel` right after the SUBSCRIBE frames. Trace console shows `Broker reported error` for the same thing.
- That console noise appears in passing tests too; it only fails tests that need a push.
- `LAUNCH-003` only asserts a WebSocket object was created and `waitForCaseSubscription` falls through after 3s, so neither catches a dead socket.
- CloudWatch is not readable with Ryan's IAM user, and dev RDS needs VPN, so flag audit history is not reachable off-VPN.
