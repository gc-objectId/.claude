---
name: project-or2994-admin-shell
description: "OR-2994 admin shell on the design language — DONE 2026-10-02: PR #4631 merged into epic/OR-2863-design-foundation (ef51c73d), worktree removed; AdminPage layout, no hamburger, bar footer default, navy outline = app-wide primary button except under body.clinical-shell, Event Center grid, launch rows; VIS-006–011 rebaselined; lessons on rebasing against a moving epic"
metadata:
  node_type: memory
  type: project
  originSessionId: 8857be2e-5222-40ce-b060-28d6dd55f4fa
  modified: 2026-10-02T20:03:58.899Z
---

OR-2994 (Story under OR-2863, assigned Ryan) — second child on the epic integration branch. Worktree
`~/dev/worktrees/OR-2994-admin-shell`, branch `feature/OR-2994-admin-shell`, 2 commits,
[draft PR #4631](https://github.com/guidedclinical/orci/pull/4631) → `epic/OR-2863-design-foundation`
opened 2026-10-02. Ticket stays In Progress until merge; VIS-006–010 rebaseline (pr-gate
`update_visual_snapshots` dispatch → download → commit PNGs) is still owed and was never done for OR-2990 either.

**Ryan's direction (2026-10-02):** "we did away with the hamburger menu altogether with OR-2990. I want to use
the design cues from that across the app." He rejected a batched AskUserQuestion about header/footer/picker
options ("I don't even know what you're asking") — for design-language children, don't ask option menus;
build the App Home cues (cream page, white panels, product mark, eyebrow, account menu) and let him react on
the running workbench. Vite for this worktree runs on **3003** (`VITE_PORT=3003 BROWSER=none
node_modules/.bin/vite`, proxied to his 8080); 3001 is the epic session, 3002/8081 another session. Chrome
cookies are shared across localhost ports, so his 3000 login works on 3003.

**What shipped:** `components/AdminPage.tsx` (`guided-page` → `Header fluid?` → `Container` → `main.guided-panel
.admin-page__main` → `Footer`), adopted by all 20 admin pages (prettier re-indented their bodies — diff is
mostly whitespace; `git diff -w` shows the real change); `Header` = product mark + "Admin" eyebrow link to `/`
plus shared `components/AccountMenu` (extracted from Home); `Footer({ clinical })` — bar footer is the
default, AppLaunch passes `clinical` for the 75px one (`.AppFooter` + `AppLaunch.scss` untouched);
`DigitalClock` takes `className`; `Form/guidedSelect.ts` react-select theme (navy focus/selection, cream
hover, `var(--guided-*)` strings work as theme colors); `Form/TenantPickerField.tsx` deleted (Med Admin
Notifications uses `TenantPickerFormikField`); `.admin-main` + the `small {0.6em}` dependency gone. Visual
spec: `adminSession` ready marker `.admin-header`, `.app-footer__clock` hidden. Pages that had no footer
(ReleaseNotes, FeatureFlags, MedAdminNotification, Feedback, IntegrationHarness) now have one.

**Gotchas:** fresh worktree needs `npm ci` in both webapp and qa-suite before typecheck; `npx vite` from the
wrong cwd downloads vite@8.3 and drops a `.vite/` dir at the repo root — use `node_modules/.bin/vite`;
pre-commit's prettier is the formatter (`pre-commit run prettier --files …`, pipe through `xargs -n 20` —
a long single list reports "no files to check"); `spec_lint.py` is not in this repo.

See [[project-or2863-design-foundation]], [[project-or2990-entry-surfaces]].

**Later the same day (2026-10-02):** Ryan drove four more rounds on 3003 — admin primary/outline-primary buttons
take the navy outline via a `.admin-page` scoped rule + `styles/_buttons.scss` mixin (cyan stays clinical); Event
Center rebuilt (context strip + event card grid showing categories, toast on send, disabled until tenant); Home
Launch = one panel with a row per tenant + horizontal three-dot row menu (Patients / Patient Templates); product
mark is the only header link, "Admin" is a plain label; `/admin` redirects to `/`. Nine commits, rebased on the
epic twice.

**Rebaseline done 2026-10-02:** pr-gate dispatch `update_visual_snapshots` on head 54f84f4c1 (run 37060898900),
artifact `pr-gate-visual-snapshots`, VIS-006–011 PNGs committed. Each cancelled dispatch costs ~25 min — batch
visual tweaks before dispatching. **Finding:** the regenerated clinical PNGs (VIS-001–005) differ from the
committed baselines — dosing form Route/Dose/Time column shifted ~9 px left, active tab label weight, favorites
sidebar rows, the `+` tab glyph (56 px). None of it is from this branch; it is OR-2990 residue on the epic branch
(its "Restore the button-group sizing and tab weight" commit did not fully restore). Left uncommitted; the PR gate
on this branch should show VIS-001–005 red and VIS-006–011 green. Pixel-diff recipe:
`require('playwright-core/lib/utilsBundle').PNG` from qa-suite (no PIL/ImageMagick on the Mac).

**CLOSED 2026-10-02 ~21:30Z.** Ryan marked #4631 ready; gate green 11/11 VIS + CI Build; merged with a merge
commit (`gh pr merge --merge`, matching #4630) → epic @ ef51c73d; Jira comment posted and ticket moved to Done;
`worktree-done` run clean. Final shape of the button rule: `custom.scss` makes `.btn.btn-primary` and
`.btn.btn-outline-primary` the navy outline mixin app-wide; `AppLaunch` calls `useBodyClass("clinical-shell")`
and `.clinical-shell .btn.btn-primary` restores cyan (`.clinical-shell .btn.btn-outline-primary` restores
Bootstrap's) — a body class is the only scope that also reaches portaled modals. `btn-guided-outline` is gone.
The clinical drift finding was resolved by the epic session rebaselining VIS-001–005 itself.

**Lessons from the moving epic:** four rebases in one afternoon. Every epic commit that touched PNGs conflicted
with this branch's baseline commit — resolve with `git checkout --theirs` (= this branch during a rebase) and
re-verify with `cmp` against the run artifact. The epic session and child sessions both edited the visual
spec's `VOLATILE_TEXT_CSS` line; merge the selectors rather than pick a side. Sign-in PNGs from two different
dispatches were byte-identical, so the gate renders deterministically — a byte diff is a real diff.
A GitHub `pull_request` gate run is cancelled by the next push (concurrency group per PR), but a
`workflow_dispatch` run is not; cancel stale dispatches by hand.
