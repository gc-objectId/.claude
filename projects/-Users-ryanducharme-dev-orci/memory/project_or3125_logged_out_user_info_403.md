---
name: or3125-logged-out-user-info-403
description: "OR-3125 (Sentry GUIDEDOR-95) logged-out /api/user/info 403 reported to Sentry — validated deploy-ready and moved to Done 2026-11-03; AUTH-005 (@supplemental) written, tests PR owed"
metadata:
  node_type: memory
  type: project
  originSessionId: 83fab668-8df6-4fd1-b680-ef65d40d358d
  modified: 2026-11-03T14:44:45.209Z
---

OR-3125 (Bug): every anonymous page load created a Sentry `HTTP 403: GET` event because the generated
hey-api axios client rejected the expected `/api/user/info` 403 and the `App.tsx` response interceptor
reported it before `fetchUserInfo` mapped it to `LoggedOutUser`. Fix (Theo, PR #4801, merged 2026-11-02):
`currentUserInfo({ validateStatus: 2xx || 403 })` so the 403 resolves and never reaches the interceptor.

**Status 2026-11-03:** validated in VALIDATE mode (positive, negative via `/api/sample-patients` 403 still
reported, flip-and-revert red), comment posted, ticket Done, worktree and branch removed. **No automation,
by Ryan's call:** a drafted AUTH-005 (Sentry envelope interception, skips on localhost) was dropped as
automating for its own sake — Sentry on dev auto-files a GUIDEDOR ticket for this event class, the fix is
three lines outside the generated client, and a regression costs only Sentry noise. Next free AUTH id is
still 005. Observability technique kept in [[sentry-frontend-observability-local]].

**Why (pattern):** when production monitoring already detects the regression class automatically and the
failure has no user impact, an e2e absence test duplicates the monitor at higher flake cost. Ask "what
detects this today?" before proposing coverage.
