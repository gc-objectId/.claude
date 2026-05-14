---
name: QA suite consolidation epic
description: Epic OR-2348 complete, OR-2384 is the active epic for module-based restructuring of qa-suite
type: project
originSessionId: 79c4eb1b-b80e-44f2-b076-e4995a36ded9
---
**OR-2348 (Complete):** Migrated Java Playwright e2e tests to TypeScript qa-suite, automated clinical validation tests, unified CI into qa-suite.yml. All phases done.

**OR-2384 (In Progress):** Restructure qa-suite into module-based architecture. Modules: smoke, clinical-rules, app-features, integrations, scanner, security.

**Child tickets:**
- OR-2330 — [BLOCKED] SSO/M365 login flow tests (needs M365 test account)
- OR-2360 — [DEFERRED] Partial launch graceful degradation
- OR-2361 — [DEFERRED] Spec-driven templates/fixtures
- OR-2368 — [BLOCKED] Stale tabs banner (TC-013)
- OR-2381 — [DEFERRED] Epic interactive notification (TC-007)
- OR-2385 — HL7/client endpoint integration tests
- OR-2386 — API token auth for test setup
- OR-2392 — Scaffold module-based qa-suite structure (foundation ticket)
- OR-2393 — Move non-rule tests from clinical-rules to app-features
- OR-2394 — Support multiple .env files in qa-suite
- OR-2395 — QA suite test reporting dashboard (GitHub Pages, non-engineer accessible)
- OR-2396 — Clean up test data after qa-suite runs (demo-demo has 204 patients)
- OR-2397 — Quote all variables in gen-env.sh (# in passwords breaks local sourcing)

**Key technical decisions:**
- Admin user for API setup, tenant user for UI interactions
- Each test creates a fresh patient (no shared state)
- `client_id` query param is load-bearing for tenant resolution on both API and UI routes — not optional
- `getSomePatients(50)` only returns 50 most recent patients — TC-005 now uses by-pmrn lookup instead
- Demo patients (patient-0 through patient-3) are lazily created from Excel workbooks on first app-launch, not seeded at build
- `AdminUserSetupRunner` resets admin password on every startup — don't set via SQL
- Playwright report/trace logs `fill()` arguments verbatim — use `evaluate()` for sensitive inputs

**How to apply:** OR-2392 (scaffolding) is the foundation — do that first. OR-2393 depends on it. OR-2397 is a quick fix. OR-2395 (reporting dashboard) and OR-2396 (test data cleanup) are larger efforts.
