---
name: project-or3071-simulation-without-mgh
description: "OR-3071 (epic child, Bug): Med Admin Simulation on hosts without the MGH site — GET /api/simulation/site probe, 404 guard on the four MGH-pinned endpoints, Notification tenant default follows the picker; spec R32–R34; SIM-011–013; state as of 2026-10-16"
metadata:
  node_type: memory
  type: project
  originSessionId: b181ad04-8f11-4eef-80c9-235f15faafb1
  modified: 2026-10-19T13:35:56.650Z
---

Worktree `~/dev/worktrees/OR-3071-simulation-without-mgh`, branch `bugfix/OR-3071-simulation-without-mgh`, rebased three times as siblings landed; last onto 7b8514faf (after OR-3003/3076/3079/3077/3078/3075/3073). Two commits (spec diff, then fix + tests) pushed 2026-10-19 as draft **PR #4723** into the epic (push needed an explicit `HEAD:refs/heads/…` refspec because workon set the upstream to origin/main). IMPLEMENT comment posted; ticket stays In Progress until merge. The ticket's `### Approved spec diff` was replaced with the rebased diff (Ryan said yes; every changed line identical, `regenerated:` bump dropped because OR-3078 already made it), byte-verified. Description edits naming keys inside the diff context created no issue links: the automation fires on comments only. OR-3077 took SIM-011, so mine are **SIM-012–014** (next free SIM-015); OR-3078 took R35/R36 (next free R37).

**Design (Ryan chose):** dedicated `GET /api/simulation/site` → `{tenantId, available}` over probing via the medications status. `withSimulationSite(Supplier)` in SimulationController = enabled check (404 "Simulation site mgb-mgh is not enabled on this host") + `withTenant`; replaces the four bare `withTenant(SIMULATION_TENANT, …)`. Page: `useSimulationSite` → checking (render nothing) / usable (also on probe failure, R34 fail-open) / unavailable (`admin-empty` "Simulation is not available on this host" in place of the three file modes, R33). Notification default tenant = launched case's, else mgb-mgh only if `useTenantOptions()` (exported from TenantPicker) offers it, else blank (R32).

**Spec:** R32 (blank tenant), R33 (not available), R34 (fail open) added. R15/R25/R28/R31 deliberately unchanged (R28 is the defect the fix restores). Tests: SIM-010 now skips via the `/site` precondition; SIM-012–014 added; VIS-032 stubs `/site`; SimulationControllerTest (8, `@WebMvcTest`).

**Evidence (2026-10-16, own backend 8082, fresh DB orci_or3071, redis db 7):** controller test red 6/8 → green 8/8; original SIM-010 red (404 vs 200) on MGB-disabled; new suite red on unfixed bundle (SIM-011, SIM-013) → green 12 + SIM-010 skipped (MGB off) and 13/13 (MGB on); SIM-011's four absence assertions all seen red via a flipped bundle.

**DONE 2026-10-19:** #4723 merged into the epic as b956aca0f, about two minutes after opening, so the branch gate never finished; the epic session regates. The merged spec, controller, page and tests match the branch exactly. Cleanup: 8082 backend stopped, `orci_or3071` dropped, `worktree-done` clean, ticket moved to Done (all ACs code, all merged). Redis db 7 flushed 2026-10-19 (only a Spring Session principal index remained; db 0 untouched).

**Re-verified 2026-10-17 on 7b8514faf:** MGB on 14/14 SIM; MGB off 13 + SIM-010 skipped, live probe 404s; controller 8/8; lint, tags (217), both typechecks clean. Throwaway DB `orci_or3071` to drop at close-out.

**Follow-up filed:** OR-3087 (child of OR-3054, Bug; added to OR-3054's Outcome list and Sequence step 1 after OR-3086; deliberately not named in OR-3071's comment): `SimulationController.tenantService` has no `@Autowired`, so `create-alert` always NPEs/500s; no callers. Fix the injection or remove the endpoint.

See [[or2863-child-session-sop]], [[project-or3062-single-mode-medication-list]], [[reference-local-aws-tenant-shape]].
