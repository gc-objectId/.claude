---
name: project-or3000-clinical-light-touch
description: "OR-3000 clinical screens onto the design tokens (light touch) — decisions, the ΔE calibration, the local 3001-vs-3035 A/B recipe, what remains as adoption backlog, and the follow-up ticket draft"
metadata:
  type: project
  originSessionId: 859305ae-db77-479a-84d7-d4c7103fdf6e
  modified: 2026-10-20T14:07:10.883Z
---

OR-3000 (Story, child of the design epic, step 11 before epic→main). Worktree
`~/dev/worktrees/OR-3000-clinical-surfaces-refresh`, branch `feature/OR-3000-clinical-surfaces-refresh`
(the ticket's Working block says `clinical-light-touch`; the slug differs, so `gh workflow run --ref` and
`gh run list --branch` take the real name). Reset onto the epic tip 3a7b4ee8f before the first commit.
Vite 3035 workbench, PID in the session scratchpad `vite-3035.pid`.

**DONE 2026-10-20: PR #4726 merged into the epic (fc960bb39), worktree removed, Vite 3035 killed, ticket Done.** Gate 39436306376: QA 150/150, visual 40/40; the CI `--update-snapshots` (changed mode) rewrote nothing because the 13-unit snap is under Playwright's 0.2 threshold — so no PNG was rebaselined and tokens.md says so. Still owed by the epic session: regate the epic head and add the clinical bullet to the epic PR body; the follow-up is filed as OR-3095 (Task under OR-3054, To Do, unassigned).

**Commit b18cc5fa2 (2026-10-19):** 69 literals → 15 in 4 files. Policy applied, in order: exact guided token
with a matching role → the token; guided token with the role within ΔE ≤ 4 (CIE76; the ticket's own example
#dee2e6→#d9d9d9 is 3.9) → snap + declare; hard-coded Bootstrap grey → `--bs-gray-N` / `--bs-tertiary-bg` /
`--bs-emphasis-color` (exact; 5.3 publishes the gray map on :root); clinical role with no token → new fixed
token at today's value; a one-off hover/transient state whose role token exists but is visibly different →
left in place and listed in `spec/design/tokens.md` "Adoption backlog" (the ticket's Done-when allows it; the
record's own rule says do not invent a token when the role exists). New fixed tokens: `color-label-frame/
-border-thin/-border-thick/-blank`, `color-banner-alert/-warning/-info` + `-warning-surface/-border`,
`-info-surface/-border`, `color-text-data` (#1c2864, the server-rendered dose/route lines), 
`color-focus-border-clinical` + `focus-ring-clinical` (#1a1a1a, also the medication picker's react-select
`primary`). Palette additions: grey-250 #dee2e6, grey-500 #c4c4c4, grey-950 #1a1a1a, indigo, seven banner
shades. The react-select selected-option tint `#DEEBFF` is the library's own `theme.colors.primary25` — read it
from the `theme` arg of `styles.option`, no token needed.

**Declared delta (confirmed locally):** only the sidebar toggle's border on VIS-001–005/036/037 and the panel
border-left + header border-bottom on VIS-002; cascade gate `changed=7 removed=0 added=0 flips=0`.

**Local A/B recipe that works for epic children:** run the visual cases against the epic workbench first with
`BASE_URL=http://localhost:3001 npm run visual:local -- --no-deps --update-snapshots=all --grep "VIS-00[1-5]|VIS-03[67]"`
(copy the `*-darwin.png` aside), then against your port with `--update-snapshots=all`, then
`npm run visual:diff -- head.png base.png 1` per pair. **`--update-snapshots` without `=all` means `changed`
and rewrites nothing when the comparison passes under Playwright's 0.2 per-pixel threshold** — a 13-unit grey
snap passes, so the first attempt showed 0 differing pixels and looked like a no-op. Playwright 1.5x; both
Vite ports proxy the same 8080 so data is identical. The hook that blocks `.env` references also blocks any
command text containing the `.env` substring (even `grep -i env`).

**Follow-up filed 2026-10-20 as OR-3095 (OR-3054 child Task):** "Move the clinical
screen's remaining state colors onto their role tokens": `#f0f0f0` row divider → border-muted; `#969da4`,
`#55595d` sidebar ghost-control hovers → one hover value; `#e8ecf8` selected macro header and `#fbf9f4` reject
reason hover → surface-hover; `#bbbaba`, `#cccccc` saving card border + loading dots → skeleton. Draft text in
the session scratchpad `followup-draft.md`.

See [[project-or2863-design-foundation]], [[or2863-child-session-sop]].
