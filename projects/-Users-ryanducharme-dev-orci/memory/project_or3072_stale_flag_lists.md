---
name: or3072-stale-flag-lists
description: "OR-3072 DONE 2026-10-19 — Feature Flags/Release Notes reopened on pre-edit data; root-key invalidation, admin-shell R30, new qa-suite configuration module; PR #4724 merged into the design epic"
metadata:
  node_type: memory
  type: project
  originSessionId: 2912e250-e5ba-470b-816d-c8ba14822e2b
  modified: 2026-10-19T13:39:51.373Z
---

DONE 2026-10-19: PR #4724 merged into the design epic (9a9bdbc1d), worktree removed, ticket moved to Done after the acceptance criteria checked out on the epic branch.

- **Fix:** one root query key per resource (`["feature-flags", "list"|"detail", …]`, `[tenant, "release-notes", "list"|"detail", …]`), invalidated after every write; release-note writes also invalidate the footer's `CURRENT_RELEASE_NOTE_QUERY_KEY`. Invalidating `["feature-flags"]` also refetches `useFeatureFlags`' `["feature-flags", username]` — intended.
- **Spec:** admin-shell R30 (page-wide: list, editor, footer). Next free admin-shell R31.
- **Tests:** new `configuration` qa-suite project (FLAG-001, RNOTE-001–003; next free FLAG-002 / RNOTE-004), real writes restored in `finally`, driven through the in-case overlay. Launch helpers `launchOperation`/`launchedSession(browser, baseURL, creds)` now live in `pages/app.page.ts`; `Debugger.selectAdminTool(name)` added.
- **Only the in-case overlay reproduces this bug:** every way off a standalone admin page is a full page load (product mark and home index are plain `<a>`; editor routes are nested), which clears the React Query cache.
- Footer refresh has no e2e (footer fetch carries no tenant header) — code only.
- Follow-ups were already filed: OR-3086 (token sweep) and OR-3085 (Medication Notes clock key; release-note detail now keyed by tenant, but the open item still survives a tenant switch).

Related: [[qa-suite-concurrent-token-sweep]], [[or2863-child-session-sop]].
