---
name: project-or3062-single-mode-medication-list
description: "OR-3062 DONE 2026-10-15: Single mode medication list now served by GET /api/simulation/medications under the pinned MGH tenant; PR #4710 merged into the OR-2863 epic (a995d5716), worktree removed, ticket Done; recipe notes for generate:api + prettier and the 808x port race"
metadata:
  node_type: memory
  type: project
  originSessionId: 166219c6-6d9c-4b36-9ac2-70d4534e1876
  modified: 2026-10-15T19:25:12.018Z
---

Worktree `~/dev/worktrees/OR-3062-single-mode-medication-list`, branch `bugfix/OR-3062-single-mode-medication-list`
reset onto `origin/epic/OR-2863-design-foundation` (ae1e6b191). Branch backend ran on **8083** (8081/8082 were
taken by sibling sessions the moment I checked; `lsof` then launch is a race, so re-check right before launching),
`spring-boot:run` from the worktree with `-P package-webapp` so 8083 serves the packaged frontend; qa-suite ran with
`BASE_URL=http://localhost:8083 npm run test:local -- test-utilities/med-admin-simulation.spec.ts --project=test-utilities --no-deps`.

**Root cause:** standalone `/admin/simulation` has no `client_id` and no tenant subdomain, so the axios interceptor
sends no `X-Tenant-Id`; `GET /api/medications` then runs with no tenant in `TenantContextHolder` → no schema →
`InvalidDataAccessResourceUsageException` → 500 → R15 text. The simulate endpoints never hit this because they pin
`TenantKey.MGH` server-side via `withTenant`.

**Fix (decided: fixed site, no tenant chooser, known gap "page does not say which site" stays):**
`GET /api/simulation/medications` → `withTenant(SIMULATION_TENANT, medicationService::getMedicationOptions)`; the option
list moved from `MedicationsController` into `MedicationService.getMedicationOptions()` (RedisService injected, cache
key unchanged); `SingleMode` calls `SimulationController.getSimulationMedications()`; spec R31 + Decision + History;
`MedicationServiceTest` (2 unit tests); SIM-010 `@supplemental` unstubbed positive; SIM/VIS-032 stubs point at the new
URL (VIS-032 render identical → no rebaseline). Generated client regenerated from 8083 — `generate:api`'s prettier
step fails (`prettier: command not found` in the webapp), so format with `pre-commit run prettier --files <generated>`
and reset the captured `baseURL` back to `http://localhost:8080` in `client.gen.ts`/`types.gen.ts`.

**Validation evidence (2026-10-15, 8083):** new endpoint no tenant → 200, 268 options; `/api/medications` no tenant →
500 (the fault); `/api/medications` with `X-Tenant-Id: mgb-mgh` → 200, 268 (same list = the site's). Unit test 2/2,
qa-suite 10/10, webapp + qa-suite typecheck clean, `check:tags` clean, spec lint clean.

**DONE 2026-10-15:** PR #4710 merged into the epic (a995d5716), `worktree-done` clean, ticket moved to Done after re-reading the ACs (all code, all shipped in the PR). The gate never ran on this branch: Ryan merged before CI Build finished, so the manual-dispatch watcher was stopped; the epic session regates the epic branch after each child merge.

See [[or2863-child-session-sop]], [[project-or2991-or2998-simulation-pages-chain]].
