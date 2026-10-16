---
name: project-or2991-or2998-simulation-pages-chain
description: "OR-2991 + OR-2998 chain DONE 2026-10-15 (PR #4702 into the OR-2863 epic): consolidated Med Admin Simulation page with modes, restyled with the harness; decisions, findings, lessons (VIS renumbering after a sibling, overlay registry, gate dispatch timing)"
metadata:
  node_type: memory
  type: project
  originSessionId: bba602c1-2aaf-4ff1-8ea2-8bfb1c68bc93
  modified: 2026-10-15T14:41:56.816Z
---

Chain branch `feature/OR-2991-simulation-pages` (worktree `~/dev/worktrees/OR-2991-simulation-pages`, Vite 3006,
own backend on 8081 via `spring-boot:run` from the worktree), base and target `epic/OR-2863-design-foundation`.
Ryan chose 2026-10-15: one PR, commits sequenced — 2991 structure + VIS-030/031 captured in CI, then 2998 restyle +
rebaseline on top. Both tickets IMPLEMENT, both assigned to Ryan.

**OR-2991 state (2026-10-15):** spec approved by Ryan and written into the ticket's acceptance criteria:
NEW `spec/features/med-admin-simulation.md` (R1–R30, `reviewed: true`) + CHANGE `admin-shell.md` R26. Decided beyond the
problem: mode in the address (`/admin/simulation?mode=single|batch|default-ndcs|notification`, old paths redirect),
PMRN/Case ID shared across modes, uniform trim, submit disabled on blank PMRN/Case ID/file, "Medications could not be
loaded" text. Code: `pages/admin/MedAdminSimulation.tsx` + `pages/admin/med-admin-simulation/{modes,CaseFields,SingleMode,
BatchMode,DefaultNdcsMode,NotificationMode}`; `MedAdminSimulationPanelTab` is the in-case panel tab. Tests SIM-001–009
(`qa-suite/test-utilities/med-admin-simulation.spec.ts`, request-body assertions via `context.route`) + VIS-030/031 —
all passing locally against 8081. Ryan said go 2026-10-15: pushed f434a8e26, CI capture run 38756136874 → VIS-030/031 baselines + VIS-006 admin-home rebaseline (R26 shrank the Test Utilities group) committed as 9bfcc8aea; OR-2998 restyle committed as 1dc399671 and pushed; rebaseline committed; draft PR #4702 opened into the epic 2026-10-15 with `Fixes OR-2991` + `Fixes OR-2998`; both tickets In Progress with IMPLEMENT comments. OR-2992 (#4701) merged first: rebased onto it — InAppAdminPanel is gone, the page is registered as `"/admin/simulation": MedAdminSimulationPanelTab` in `components/InCaseOverlay/adminPanels.ts` (keyed by `AdminHref`, so typecheck enforces the key set); my VIS cases renumbered to **VIS-032/033** (2992 took 030/031; next free VIS-034); spec term "In-case Admin Panel" points at the in-case-overlay spec. Dispatched gate on the rebased head (38763712348): QA 132 passed, visual 31/33 — the two failures were 2992's overlay VIS-030/031 at 1920×1080 (the overlay lists the admin index, so my R26 change shrank its Test Utilities group); rebaselined from the gate's `-actual.png` (a CI render, same as a capture) in 23adcf281, a dispatch fired while CI Build was still running got cancelled (short-circuit) — dispatch only after CI Build completes; final gate run 38767068293 on 23adcf281 GREEN (QA 132, visual 33/33), linked in a PR comment. **DONE 2026-10-15:** PR #4702 merged into the epic (f11c4621a), worktree removed via worktree-done, 8081 backend stopped, both tickets moved to Done. Follow-ups filed 2026-10-15 under OR-2863, both To Do, unassigned: OR-3062 (Bug: standalone `/api/medications` has no tenant → Single shows the R15 text; needs a /feature-spec CHANGE) and OR-3063 (Task: `event-center.md` covers still lists the deleted InAppAdminPanel.tsx, breaks CI Build spec lint on every child; the PMD failure under OR-2990 also cancels the pull_request gate). Requirements without a direct test: R6, R9 (overlay registration/prefill), R21, R30. CI Build fails on every epic child (PMD, plus `event-center.md` covers still lists the deleted InAppAdminPanel.tsx — 2992 fallout, flagged to Ryan, not fixed here), which cancels the pull_request gate → use `gh workflow run pr-gate.yml --ref <branch>` for the green. After merge: `worktree-done`, then re-read ACs and move both to Done (2991 AC includes the approved diff; 2998 verification = typecheck + color literals + visual delta declared).

**Findings:** (1) the standalone page's `/api/medications` call has no tenant (the axios interceptor derives it from
`client_id` in the URL, absent on admin pages) → 500 → the old page silently showed an empty medication list; the new
page shows the R15 text. Tests and VIS-030 stub the list. Follow-up ticket not filed yet. (2) A regex edit of App.tsx
swallowed the integration-harness/reporting/feedback routes; VIS-031 caught it (page rendered nothing) — restored before
commit. Lesson: after any scripted App.tsx edit, diff `path=` lines against HEAD. (3) `async` helper returning a Promise
flattens — return `{ request }` instead. (4) The Bash hook blocks any command text containing `.env`, including
`process.env` inside a heredoc → write such files with the Write tool. (5) PMD fails the epic build (known, OR-2990);
build with `-Dpmd.skip=true`; the plain `orci-*.jar` is not Boot-repackaged, use `spring-boot:run`.

**OR-2998 done locally (2026-10-15):** cascade gate = added 1 (`.admin-pre--scrolling`), changed 0, removed 0; color baseline 86→84 / 19 files; SIM + VIS-030/031 green on the restyled bundle. Original plan: `AdminPageHeader` title/meta, `admin-tabs` mode switch, `admin-filters`/`admin-field` + `guided-eyebrow`
labels, drop inline widths, `admin-pre` for payload and harness output (removes the harness's 2 hex literals → baseline
regen with `--update`), no new shared piece if avoidable. Then `check:cascade`, typecheck, `check:color-literals`,
dispatch capture, rebaseline VIS-030/031, draft PR into the epic with `Fixes OR-2991` and `Fixes OR-2998`.

See [[or2863-child-session-sop]], [[project-or2863-design-foundation]].
