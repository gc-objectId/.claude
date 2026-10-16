---
name: project-or2999-overlay-restyle
description: "OR-2999 in-case overlay restyle — DONE 2026-10-15: PR #4705 merged into the epic (ba841f779), worktree gone, ticket Done; follow-ups filed OR-3065 (Timeline graphical rebuild, Story) + OR-3066 (AppLaunch nav-link leak, Task, Relates to the epic), both main-bound after the epic lands"
metadata:
  type: project
  originSessionId: b9ff0b5f-9a35-4a4d-8255-5753e7b74133
  modified: 2026-10-15T18:04:26.897Z
---

OR-2999 (Story under the design epic, Ryan, To Do → IMPLEMENT) styles the unified in-case overlay
that OR-2992 built. Worktree `~/dev/worktrees/OR-2999-overlay-restyle`, branch
`feature/OR-2999-overlay-restyle` fast-forwarded onto the epic (`git merge --ff-only origin/epic/…`),
Vite 3009 with `VITE_GIT_SHA=$(git rev-parse --short HEAD)` (without it the App tab threw
`process is not defined` and dropped the whole case to the error boundary — fixed in this ticket).

**Decisions (Ryan, 2026-10-15):** admin-page look for the chrome (cream ground, navy sidebar, white
panel, admin-tabs); validated 8-slot dataviz palette as `color-chart-series-1..8` + ground/grid/axis
(every brand-derived candidate failed the CVD check, ΔE 4–5 vs 8); App tab `process.env` fix in this
PR; new VIS-034 (Tracked Values graph, stubbed) + VIS-035 (Allergies, stubbed via
`qa-suite/visual/overlay-stub.ts`); Ryan also asked for a **ticket draft: upgrade the Timeline to
something more graphical and efficient** (show before creating).

**Declared visual delta:** VIS-012 (ViewOperation embeds DebuggerTabs → navy tabs), VIS-022 (admin job queue
shares JSONView's payload block), VIS-030, VIS-031, VIS-034, VIS-035. Clinical screens untouched: `check:cascade origin/epic/…` = changed 3 (`:root` new
tokens + two overlay paddings), removed 0, added 15 (all overlay/utility selectors).

**Found, not fixed (tech-debt ticket to draft):** `AppLaunch.scss` has unscoped
`.nav-link:not(.active) { background-color: #f7f7f7 !important }` and `.nav-link { border-color …
!important }` that leak into every nav in the app (admin tabs too). Overlay counters it locally
(`.in-case-overlay__nav .nav-link:not(.active) { background: transparent !important }`); scoping the
source would move 10+ admin baselines.

**Lesson:** a hover color that differs from the resting color makes CI's resting mouse position visible in a
baseline (VIS-030 caught the sidebar's maroon hover); `openInCaseOverlay` now parks the mouse at (0,0).

**Sequence:** commit 1 f05c16bb2 (VIS-034/035 pre-restyle) → capture run 38780278586 → commit PNGs →
commit 2 restyle (local) → push → second `update_visual_snapshots` dispatch → commit only the five
declared PNGs after confirming the rest are byte-identical → capture 2 (38782787482) found the undeclared VIS-022 diff + the hover → commit 65373c361 (10 PNGs + mouse park)
→ capture 3 (38785322851, QA step red on the known INS-004 flake only, snapshots fine) → dd40127f6 VIS-030 PNGs → **draft PR #4705 into the epic, Jira comment posted 2026-10-15.** Next: Ryan merges; then `worktree-done`, re-read acceptance criteria, Done. Never push while a
capture run is in flight (gate concurrency cancels it).

See [[project-or2992-in-case-overlay]], [[or2863-child-session-sop]], [[project-or2863-design-foundation]].
