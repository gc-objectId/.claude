---
name: project-or3071-simulation-without-mgh
description: "OR-3071 (epic child, Bug): Med Admin Simulation on hosts without the MGH site — GET /api/simulation/site probe, 404 guard on the four MGH-pinned endpoints, Notification tenant default follows the picker; spec R32–R34; SIM-011–013; state as of 2026-10-16"
metadata:
  node_type: memory
  type: project
  originSessionId: b181ad04-8f11-4eef-80c9-235f15faafb1
  modified: 2026-10-17T08:48:19.400Z
---

Worktree `~/dev/worktrees/OR-3071-simulation-without-mgh`, branch `bugfix/OR-3071-simulation-without-mgh`, rebased three times as siblings landed; last onto 7b8514faf (after OR-3003/3076/3079/3077/3078/3075/3073). Two local commits, not pushed as of 2026-10-17: spec diff then the fix + tests. The ticket's `### Approved spec diff` matches the old base; on the new base every changed line is identical except the `regenerated:` bump, which OR-3078 already made. Replacing the block needs Ryan's yes. OR-3077 took SIM-011, so mine are **SIM-012–014** (next free SIM-015); OR-3078 took R35/R36 (next free R37).

**Design (Ryan chose):** dedicated `GET /api/simulation/site` → `{tenantId, available}` over probing via the medications status. `withSimulationSite(Supplier)` in SimulationController = enabled check (404 "Simulation site mgb-mgh is not enabled on this host") + `withTenant`; replaces the four bare `withTenant(SIMULATION_TENANT, …)`. Page: `useSimulationSite` → checking (render nothing) / usable (also on probe failure, R34 fail-open) / unavailable (`admin-empty` "Simulation is not available on this host" in place of the three file modes, R33). Notification default tenant = launched case's, else mgb-mgh only if `useTenantOptions()` (exported from TenantPicker) offers it, else blank (R32).

**Spec:** R32 (blank tenant), R33 (not available), R34 (fail open) added. R15/R25/R28/R31 deliberately unchanged (R28 is the defect the fix restores). Tests: SIM-010 now skips via the `/site` precondition; SIM-012–014 added; VIS-032 stubs `/site`; SimulationControllerTest (8, `@WebMvcTest`).

**Evidence (2026-10-16, own backend 8082, fresh DB orci_or3071, redis db 7):** controller test red 6/8 → green 8/8; original SIM-010 red (404 vs 200) on MGB-disabled; new suite red on unfixed bundle (SIM-011, SIM-013) → green 12 + SIM-010 skipped (MGB off) and 13/13 (MGB on); SIM-011's four absence assertions all seen red via a flipped bundle.

**Re-verified 2026-10-17 on 7b8514faf:** MGB on 14/14 SIM; MGB off 13 + SIM-010 skipped, live probe 404s; controller 8/8; lint, tags (217), both typechecks clean. Throwaway DB `orci_or3071` to drop at close-out.

**Follow-up filed:** OR-3087 (child of OR-3054, Bug): `SimulationController.tenantService` has no `@Autowired`, so `create-alert` always NPEs/500s; no callers. Fix the injection or remove the endpoint.

See [[or2863-child-session-sop]], [[project-or3062-single-mode-medication-list]], [[reference-local-aws-tenant-shape]].
