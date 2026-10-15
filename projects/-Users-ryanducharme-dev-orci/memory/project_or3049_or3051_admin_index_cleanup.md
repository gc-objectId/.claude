---
name: project-or3049-or3051-admin-index-cleanup
description: "OR-3049 + OR-3051 DONE 2026-10-14 (PRs #4684, #4688 merged into the epic), worktree gone; admin index now lives in components/adminIndex.ts; group placement deferred to OR-2404; bundle-hash diff proves a dead-export delete"
metadata:
  node_type: memory
  type: project
  originSessionId: eb7f090d-997c-4ef5-ba72-f6ab8917baf4
  modified: 2026-10-14T18:22:22.444Z
---

OR-3049 (Story) + OR-3051 (Task), both children of OR-2863, worked as one chain on
`feature/OR-3049-admin-index-cleanup` (worktree `~/dev/worktrees/OR-3049-admin-index-cleanup`), fast-forwarded
onto the epic (`git merge --ff-only origin/epic/...` works when `git reset --hard` is classifier-blocked).
**Both DONE 2026-10-14: PR #4684 (b1d892bef) and the rename PR #4688 merged into the epic; `worktree-done` clean; both tickets Done.**
Commits: e5b5f2bdf (3051), 8d09b55e2 (3049), 6a0ac2a53 (admin-home rebaseline from CI run 38612841592).

- OR-3049: index text is now "Send timing events to a case as if from the EHR" (wraps to two lines at 1920, shifts the
  Monitoring column). Stayed under Monitoring: Monitoring-vs-Test-Utilities is admin IA, owned by OR-2404.
- OR-3051: `MainNavLinks` deleted; `adminIndex` + `useLaunchTenants` stay in `MainNav.tsx` per the ticket. The file
  name no longer matches its contents (candidate rename `adminIndex.ts`; `covers:` in admin-shell/front-door specs
  moved with it) — Ryan asked for it right after merging #4684; it is PR #4688.

**Technique worth reusing:** to prove deleting an unrendered export is a no-op, build with a fixed
`VITE_GIT_SHA` before and after and diff `dist/` — an unchanged chunk hash means Rollup had already tree-shaken
it; only the source map differs. Pair it with a CI snapshot regeneration and `cmp` every PNG against the
committed baselines for the "byte-identical" claim.

See
[[or2863-child-session-sop]], [[project-or3043-baseline-feature-specs]], [[dead-code-ownership]].
