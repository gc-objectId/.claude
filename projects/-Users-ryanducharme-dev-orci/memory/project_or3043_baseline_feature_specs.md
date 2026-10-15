---
name: project-or3043-baseline-feature-specs
description: "OR-3043 baseline feature specs (front-door, admin-shell, event-center) — DONE 2026-10-14: PR #4683 merged into the epic (25367dbca), worktree gone; Suspect tickets OR-3045–3050 + tech-debt OR-3051 filed; Ryan is sole approver for epic-branch specs; `[spec R<n>]` test-title convention"
metadata:
  node_type: memory
  type: project
  originSessionId: 62fc9372-38d8-4d58-a054-519dcdacf46c
  modified: 2026-10-14T17:51:38.682Z
---

OR-3043 (Story under OR-2863, assigned Ryan). Worktree `~/dev/worktrees/OR-3043-baseline-feature-specs`,
branch `feature/OR-3043-baseline-feature-specs` reset onto the epic @ 2b17f4a96 (workon cut it from main).
**DONE 2026-10-14: PR #4683 merged into the epic branch (merge 25367dbca, commit c62eadc89); `worktree-done` clean; ticket moved to Done.** The epic session still needs to pull.
First `spec/features/` files in the repo: `front-door.md` (R1–R50), `admin-shell.md` (R1–R27),
`event-center.md` (R1–R22), `reviewed: false`, History `extracted`, blockquote under the H1 says it baselines
the epic branch. Ledger = PR comment + Jira comment (the PR template forbids tables in the body).

**Ryan's rulings 2026-10-14:** visual/front-door specs are "new ground" — emulate the feature-spec rules but
forge our own path; Ryan is the ONLY approver while this lands on the epic branch (Theo/Alex see it at the
epic→main PR). Dead code made dead by *this* story gets deleted in the story; made dead by another story →
tech-debt ticket (hence OR-3051 for `MainNavLinks`, made dead by OR-2994). The `/feature-spec` skill is
feature/logic-only; amending it for this area is a later task.

**Conventions set here (no OR-3017 precedent existed):** a test that proves a requirement ends its title with
`[<spec> R<n>, R<m>; <spec2> R<k>]` (check:tags only needs the `PREFIX-NNN: ` head); documented in
`qa-suite/tests-readme.md` + `qa-suite/CLAUDE.md`. Renamed: AUTH-001/002/004, PAT-003, VIS-006/007/011/024
(+ companion md headings).

**Follow-ups filed (all under OR-2863, To Do, unassigned):** OR-3045 Home shows admin links to non-admins
(R21); OR-3046 Launch by ID inert except demo-demo/mgb-* (R30, incl. demo-qa); OR-3047 user-info 5xx →
spinner forever (R49); OR-3048 non-admin on admin page → redirect loop with front-door R3 (admin-shell R2,
predates epic); OR-3049 index text "Inspect and replay inbound events" (R25); OR-3050 Event Center "Sent"
toast for unknown/blank case (R20); OR-3051 (Task) delete `MainNavLinks`.

**Verification recipe:** Ryan's 8080 runs `main`, which has no `.home-hero`, so AUTH-001/uiLogin are red
there regardless — run `BASE_URL=http://localhost:3001 npm run test:local -- --grep "AUTH-00[124]|PAT-003"
--project=smoke-auth --project=smoke-data --no-deps` against the epic Vite workbench (proxies /api, /csrf,
/websocket to 8080). VIS cannot go green locally; `--list` is the check. `ErrorPage.tsx` is NOT dead — it is
the Sentry error-boundary fallback in `index.jsx` (a .jsx file a `*.tsx` grep misses).

See [[feature-specs-program]], [[project-or2863-design-foundation]], [[or2863-child-session-sop]].
