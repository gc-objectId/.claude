---
name: sentry-frontend-observability-local
description: "How to watch frontend Sentry reports locally — runtime Sentry.init through the Vite prebundled module, and the [::1] host that bypasses the isLocal guard so Playwright can intercept envelopes"
metadata:
  node_type: memory
  type: reference
  originSessionId: 83fab668-8df6-4fd1-b680-ef65d40d358d
  modified: 2026-11-03T14:44:44.619Z
---

The webapp only calls `Sentry.init` when `window.location.hostname` is not `localhost`/`127.0.0.1`
(`src/index.jsx`, `isLocal`). Two ways to make the reporter observable on a local build:

- **Browser console, zero source edits:** fetch a served module that imports Sentry
  (`/src/utils/request.ts`), regex out the `/node_modules/.vite/deps/@sentry_react.js?v=…` URL,
  `import()` it (same instance the app uses) and call `init({ dsn: <fake>, tracesSampleRate: 0,
  beforeSend(e) { record; return null } })`. Trigger `fetchUserInfo` without a reload by client-side
  routing to `/logout` (`history.pushState` + `popstate`): `LogoutPage` → `logout()` → `POST /api/logout`
  → `retrieveUserInfo()`.
- **Playwright:** run with `BASE_URL='http://[::1]:<port>'` — hostname `[::1]` is not "local", so
  Sentry initialises; `page.route(/\.ingest\.(?:[a-z]+\.)?sentry\.io\//)` captures every envelope
  (newline-delimited JSON; error items have `exception.values[0].value`) and fulfilling it keeps the
  event out of real Sentry. Vite and Spring both listen on IPv6. AUTH-005 uses this and skips on
  localhost. Pattern established validating [[or3125-logged-out-user-info-403]].

**Why:** the generated-client 4xx interceptor in `App.tsx` has no console output — `reportHttpError`
goes straight to `Sentry.captureException`, so without a bound client there is nothing to assert on.
