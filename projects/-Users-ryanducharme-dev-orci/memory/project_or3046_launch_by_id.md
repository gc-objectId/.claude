---
name: or3046-launch-by-id
description: "OR-3046 Launch by ID for every tenant — IMPLEMENT on the epic branch; draft PR #4704 opened 2026-10-15; spec diff approved into the ticket; LAUNCH-008/009; not-found message leaks PatientId wrapper (follow-up Task to file)"
metadata:
  node_type: memory
  type: project
  originSessionId: 1f46c39e-e592-4ad3-b445-fb04a4a42f50
  modified: 2026-10-15T17:51:53.712Z
---

OR-3046 (Story under the OR-2863 design epic): the "Launch by ID" dialog only launched `demo-demo` and
MGB tenants; everything else was logged and ignored. Fix: one case launch address for every tenant,
MGB `user_id` + placeholder Epic params dropped.

**DONE 2026-10-15:** [PR #4704](https://github.com/guidedclinical/orci/pull/4704) merged into the epic
branch (1dc41910e), ticket moved to Done, worktree and branch removed via `worktree-done` (exit 0, handled
the epic-branch merge without forcing).

**Why the MGB addition is safe to drop:** `LoginController.loginCheck` reads `user_id` only for the MGB
user-mismatch check (no-op for the signed-in user's own id, skipped when absent); the `EpicSource*` params
are consumed only by the `mgb` login strategy, which runs only when `needsLogin` is true, and the dialog is
reachable only signed in. On `*.guidedclinical.com` hosts the server blocks MGB launches anyway
("Launch Disabled", `checkTenantAppLaunchBlocked`).

**Spec:** front-door R28 changed, R29/R30 removed, R53 added (next free front-door id R54). Approved diff is
verbatim in the ticket's Acceptance criteria; Ryan approved "as drafted" (reason stays behind "Show
details", R43 unchanged). Draft lived in the session scratchpad under `spec/features/`, linted with
`python3 .github/scripts/spec_lint.py --changed`.

**Tests:** LAUNCH-008 (@core, QA tenant smoke case through the dialog) and LAUNCH-009 (@supplemental,
unknown patient → "Unable to launch GuidedOR for this case" + "Show details"). Next free LAUNCH-010. Run from
the worktree: `BASE_URL=http://localhost:3019 npm run test:local -- --grep "LAUNCH-008|LAUNCH-009"
--project=smoke-launch --no-deps` — Vite on 3019 proxied to Ryan's 8080 works for LAUNCH tests (login, /api,
/websocket all proxied). Dialog selectors: `#quick-launcher-tenant` (select), `#quick-launcher-patient`,
`#quick-launcher-case` (react-select creatable; fill + Enter).

**Follow-up filed as OR-3064 (Task under the epic, 2026-10-15):** demo-tenant not-found during launch throws
`RecordNotFoundException("Patient with id: " + patientId + " not found")` — `PatientId` is a record, so the
user-facing "Show details" text reads `Patient with id: PatientId[value=…] not found`, and it comes back as a
500 (no `@ResponseStatus`). LAUNCH-009 asserts that exact text, so the follow-up must update it.

**Bash hook gotcha:** any Bash command whose text contains `process.env.X` is blocked as a ".env secrets
file" reference — write test files with the Edit/Write tools instead. Also `echo =====` breaks in zsh
(`=cmd` expansion) and `grep --include=*.ts` must be quoted.

See [[or2863-child-session-sop]], [[project-or2863-design-foundation]].
