---
name: project-or2863-design-foundation
description: "OR-2863 design foundation epic — phase 1 (2868/2864/2869) merged 2026-09-30; phase 2 look-and-feel underway on the epic integration branch (login, App Home, dev banner, shared surfaces); branching model, findings, token gaps"
metadata:
  node_type: memory
  type: project
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
  modified: 2026-10-05T13:56:11.480Z
---

OR-2863 (Epic, app-wide incl. clinical) centralizes GuidedOR's visual language. Children:
OR-2868 visual regression baseline (Task) → OR-2864 Bootstrap import order (Bug) → OR-2869
design record (Story) → adoption → Storybook → Bootstrap 5.3 color modes. OR-2404 (Story: admin
IA only) and OR-2405 reparented under it. OR-2879 App Home landing surface, OR-2880 rules handbook.

**DONE 2026-09-30:** [PR #4573](https://github.com/guidedclinical/orci/pull/4573) merged (6b875fdbe),
OR-2868/2864/2869 all Done, worktree removed. In the PR Ryan framed the work as standalone (a baseline
"so we have it" + bug fix + tokens) rather than as the epic's foundation; since 2026-09-30 he is
actively driving phase 2 on the epic branch ("awesome, and fun") — see Phase 2 below. Review feedback: Theo/Jordan
tripped on the word "token" (kept, defined in template + record); Theo caught masks painting the
visually-hidden dosing form on alert screens (fixed by scoping the mask to `.dose-display:not(.visually-hidden)`).
Follow-up filed 2026-09-30 as OR-2977 (Task under OR-2863, To Do, unassigned): log viewport size +
user agent at app launch (server-side line + Sentry tag) so the two snapshot viewports get replaced with real data;
Hyperspace window is user-resizable per Theo, so widths are representative checks, not a spec. Ryan's decisions: viewports 1920×1080 + 1280×800; prose doc in
`spec/design/` (not docs/); `full` and `gate` exclude `@visual`.

**Root defect (fixed by 2864):** `custom.scss` imported Bootstrap before the `$guided-*` vars, so the
`$theme-colors` merge was dead. Reorder = functions → tokens/overrides → variables → merge → maps →
mixins → utilities → root → components → utilities/api (mirror `bootstrap.scss`, keep the `bsBanner`
so the compiled diff is additive). Proven: compiled CSS diff 4 lines removed (manual
`.bg-guided-secondary`), 258 added. Structural gate command:
`npx sass --no-source-map --style=expanded --load-path=node_modules src/custom.scss` on both versions
and `diff`.

**Token layer (2869):** `webapp/src/styles/_tokens.scss` — palette (only place hex may live),
semantic `$guided-color-*` (primary…dark = Bootstrap defaults; surface/border/text; `action`/
`action-secondary` = cyan/cream buttons; `accent` = maroon; `heading` = navy), type/spacing/elevation
at Bootstrap 5.2.3 defaults, `$guided-css-tokens` map emitted as `--guided-*` on `:root`. Neutral by
construction: diff vs 2864 compile = 0 removed, 35 added. `$primary` is still Bootstrap blue while
`.btn-primary` is hand-overridden to cyan — the phase-2 declared-delta decision. Guard:
`npm run check:color-literals` (webapp) + `scripts/color-literal-baseline.json` (113 literals / 24
files; fails on growth AND on stale baseline; `--update` regenerates), runs in `typescript.yml`.
Design record `spec/design/tokens.md` (`reviewed: false`); `spec_lint.py` gained a `design` kind +
`docs/templates/spec-design.md` — any new `spec/` subdir is linted as a rule spec unless `kind_of`
knows it.

**Visual suite (2868) — how it actually works:** `qa-suite/visual/visual-regression.spec.ts`,
project `visual` (deps smoke-launch, `retries: 0`, `snapshotPathTemplate` `{arg}-{platform}`),
VIS-001–010, 22 linux PNGs committed; `*-darwin.png` gitignored. pr-gate: `changes` job has a
`webapp` filter (`orci/src/main/webapp/**`, `qa-suite/visual/**`); step "Run visual regression"
runs `npm run visual -- --no-deps` after `npm run gate`, uploads `pr-gate-visual-snapshots`;
`workflow_dispatch` input `update_visual_snapshots` passes `--update-snapshots`. Rebaseline =
dispatch → download artifact → commit. First CI run with no baselines fails but uploads the actuals
(Playwright default `updateSnapshots: missing`, non-retriable). Gate concurrency cancels in-progress
runs on push — space pushes out or lose the run.

Determinism lessons (each cost a run): default procedure `p-gastro-uncomplicated` fires the
no-antibiotic alert that intercepts the dosing form — use `p-gastroduodenal`; unsaved tabs restore
into the next launch on the same case ("Restore Meds") — one case per session; multi-alert view
renders only the active card, so wait on `.list-group-item` count not the second `[data-rule-id]`;
after `save()` the app leaves the home tab — call `navigateToHomeTab` again; a mask box tracks the
element, so variable-width text (footer clock, `.timeAgo`, alert "ago") leaks a 1-px column — hide it
via `page.addStyleTag` instead; auto-layout table columns shift with random PMRN widths — mask the
whole `table`; the feature-flags admin page has no footer. Flip check: `$guided-primary`/
`$guided-brand-cyan` → `#ff0000` goes red on exactly VIS-003/004/006/008/009 (the screens with a
`.btn-primary`). Local loop: worktree app on 8081 via `./mvnw -pl orci spring-boot:run` (needs
JAVA_HOME=brew openjdk 25, `-Duser.timezone=UTC`, `-Dtenants.demo.qa.enabled=true`; `-o` breaks on
the audio plugin), then `./mvnw -q -pl orci process-resources -P package-webapp` + devtools restart
(~25 s) to swap the bundle.

**Findings for later tickets:** `FavoritesMedsSidebar` component is unreferenced dead code (16 hex
literals); feature-flags page labels `enableDate: 0` flags "disabled: missing publish date" though
enabled at runtime; Storybook `preview.ts` loads stock `bootstrap.min.css` and then `App.scss` →
Bootstrap compiled twice (drop the stock import in the Storybook ticket).

**Phase 2 — look-and-feel (2026-09-30 →).** Branching model Ryan chose on 2026-10-02: the epic branch
`epic/OR-2863-design-foundation` (worktree `~/dev/worktrees/OR-2863-design-foundation`, pushed to origin, ==
main @ 6b875fdbe) is the *integration* branch. Child-story worktrees branch off it with
`git worktree add ~/dev/worktrees/OR-NNNN-slug -b feature/OR-NNNN-slug epic/OR-2863-design-foundation`
(NOT `workon`, which starts from main); child PRs use `gh pr create --draft --base epic/OR-2863-design-foundation`;
one big PR epic→main at the end. Every open child's Jira description carries a "## Branch" section saying so
(OR-2977 viewport logging left out — non-visual, Ryan may take it straight to main). Session model: the epic
session (named "2863") does planning/epic execution; each child gets its own session + worktree. First
child: **OR-2990** "Apply the design language to the sign-in and front-door surfaces" (Story, assigned Ryan,
open-ended theming+cleanup), worktree `~/dev/worktrees/OR-2990-entry-surfaces`, branch
`feature/OR-2990-entry-surfaces` — draft PR #4630 into the epic opened 2026-10-02, see [[project-or2990-entry-surfaces]]. The epic session added OR-2994–2997 (admin shell / patients / clinical data / platform pages) on 2026-10-02. Admin side is
the proving ground; clinical surfaces stay untouched until the language is settled. Vite loop:
`VITE_PORT=3001 BROWSER=none npx vite` from the worktree webapp, proxied to Ryan's 8080.

**Phase 2 ticket map (created 2026-10-02, all To Do, unassigned, each with a "## Branch" section → epic
branch, a per-page eyes-on + function-check method, declared visual delta, VIS case before restyle):**
OR-2994 admin shell + shared components (Header/Footer/PaginatedView/pickers/HelpTooltip/Skeleton; delta
VIS-006–010; clinical Footer is shared → split or declare) · OR-2995 admin patients & cases (list, detail,
templates, ViewOperation host, QuickPatientLauncher; VIS-007–009) · OR-2996 admin clinical reference data
(medications, allergy reactions, manage-data tabs + upload modal) · OR-2997 admin platform & ops (feature
flags, release notes, feedback, API tokens, job queue, reporting, event center, HL7 messages — heaviest page,
890 lines/16 inline styles) · OR-2998 admin test utilities (4 simulations + integration harness) · OR-2999
in-app debugger (17 tabs) + InAppAdminPanel + Timeline + TimeSeriesGraph (chart colors → categorical token
palette; VIS-001–005 must not move) · OR-3000 [DEFERRED] clinical surfaces (inventory + constraint; is where
the design decision lands) · OR-3001 (Task) dead styling + duplicate Bootstrap compiles (delta none, baseline
shrinks) · OR-3002 Storybook real theme (epic step 5) · OR-3003 Bootstrap 5.3 + color modes (epic step 6).
OR-2990 also owns `/logout`, `/sso-response`, `ErrorPage` and the webfont question. Epic Vite workbench:
`VITE_PORT=3001` from `~/dev/worktrees/OR-2863-design-foundation`; 3002/8081 belong to other sessions.

**OR-2990 merged into the epic branch 2026-10-02 (PR #4630, 10 commits, epic @ 30f9e97b5):** besides the
entry surfaces it closed the token gaps, added a compact `Footer` variant (answers 2994's footer-split
question), VIS-011, and did most of OR-3001 (CRA leftovers + logo.svg gone, Bootstrap compiled once,
baseline 113→109). OR-3001 narrowed to deleting `FavoritesMedsSidebar/` + baseline regen.

**Post-merge gate findings (2026-10-02, fixed directly on the epic branch, no PR):** (1) `DevModeBanner`
renders on the gate's host once `/api/is-prod` treats any localhost as non-prod → every snapshot 29px taller;
fix = `.dev-mode-banner { display: none; }` in the spec's `VOLATILE_TEXT_CSS` (55df9eaed). (2) Removing the
duplicate Bootstrap compiles un-shadowed `custom.scss`'s `small, .small { font-size: 0.6em }` — Bootstrap's
later `.small {.875em}` had always won in production builds, so the rule had never rendered; going live it
shrank the footer disclaimer, "Showing N of M", and the `<small>` page headings on all 11 screens. Fix =
delete the rule (1425983c3). (3) Sass `@extend` inside a file that imports all of Bootstrap has side
effects: Bootstrap's `.btn-group-sm > .btn { @extend .btn-sm }` dragged `.AppLaunch .btn-sm` sizing onto
the dosing-form option groups, and `@extend .fw-bold` carried `!important`; dropping the import lost both
(VIS-003 41k px, VIS-001/005 15 px on the selected "+" tab). Fix = state them explicitly in
`AppLaunch.scss` (e01753bf8). Lesson: a "compile once" cleanup is NOT neutral when the duplicate was
masking equal-specificity overrides or feeding `@extend` — run the compiled-CSS diff and the visual suite,
never assume. **The structural gate that actually works is an effective-cascade diff, not a line diff:**
`vite build` both trees, prettier the CSS, then per-selector last-declaration-wins compare (script at
`scratchpad/cssgate/cascade-diff.mjs`, needs to run from inside webapp/node_modules to resolve postcss).
Clean result for 2990 = `changed=1` (`:root` gained tokens), `removed=6` (CRA leftovers), 73 added — BUT
per-selector compare is blind to **order flips between different selectors of equal specificity**, which is
exactly what dropping the later Bootstrap copies changes; `order-flips.mjs` (same dir) finds those, noisily.
Fastest truth: the same case on 3000 (main) and 3001 (epic) in Chrome (localhost cookies are shared across
ports) + a JS probe of rects/computed styles; plus `scratchpad/pngdiff.mjs` (pure-node PNG decoder) to get
exact diff bboxes from the artifact's actual/expected pairs. Remaining clinical diffs after run 3
(37059559488), all un-shadowed app rules: (4) `.form-section { padding-left: 3px }` now beats
`.row > *` gutter (12px) → dosing form content 9px left (VIS-003); (5) `.favorites-sidebar__edit-btn
{display:flex; border:none; padding:2px 4px}` now beats `.btn` → header 44→41px, rows 2px wider (VIS-002);
(6) `.AppLaunch .nav-tabs .nav-link { color: $black }` now beats `.nav-tabs .nav-link.active` (#495057) →
selected tab text black (VIS-001/003/004/005, the "+" and the med tab label). Ryan chose (B) 2026-10-02:
deltas declared on OR-2990, VIS-001–005 rebaselined; the compact footer's clock also had to be masked
(`footer .text-start`, not `.AppFooter .text-start`) — VIS-006 flaked on time of day until then. Final
state: epic @ 2e1745cf4, gate run 37065856393 green (QA 115, visual 11/11); regenerated baselines matched
committed byte-for-byte on unchanged screens across two CI renders (that equality is the stability proof).
OR-2990 commented + Done. Each gate dispatch ≈ 20 min; a watcher needs restarting every 10 min.

**OR-2994 merged 2026-10-02 (PR #4631 → epic @ ef51c73d4, 29 ahead of main; merge tree == gated PR head, so
green by construction).** All 20 admin pages now sit on `AdminPage`; baseline 106 literals / 22 files.
Remaining inline-style debt: HL7Messages 16, MedAdminSimulation 7, APIToken 5, FeatureFlags 5, ReleaseNotes 4,
Debug components 56, Timeline 11; patients/clinical-data pages ≈ 0 (content-level review only). Other sessions
added children: OR-2991 consolidate the 4 simulation pages (structure; do before OR-2998 styles them),
OR-2992 unify InAppAdminPanel + InAppDebugger overlays (structure; do before OR-2999), OR-3004 VIS-010 from a
fixed flag fixture (do before OR-2997 touches feature flags). OR-2405 reframed: inventory lives in
`MainNav.tsx`, ticket is nav-structure proposal only. **Gate tools landed on the epic branch 2026-10-02 (commit "OR-3001: Add the cascade and snapshot diff gates"):**
webapp `npm run check:cascade -- <base-ref> [--all-flips]` (builds base ref in a temp worktree + working
tree, prettier, `scripts/cascade-diff.mjs`: per-selector effective diff + equal-specificity order flips
filtered to pairs whose rightmost compound shares a class or is `*` — still noisy vs generated utilities,
and blind to pairs that only share an element in the DOM, e.g. `.favorites-sidebar__edit-btn` vs `.btn`);
qa-suite `npm run visual:diff -- actual.png expected.png` (bounding boxes via playwright-core's bundled
PNG). Documented in `qa-suite/tests-readme.md` under Visual regression. Self-test: `check:cascade HEAD` →
changed=0 exit 0. `origin/main` has moved past the epic's base (902df19ac); the epic needs a merge from
main before its PR. Suggested order from here: 3001 + 3004 (tiny) →
2995/2996 (light, parallel) → 2997 (heavy) → 2991 → 2998 → 2992 → 2999 → 3002 → 3003; 2404/2405/2879/2880
on their own track. **OR-3001 DONE 2026-10-02 — PR #4632 merged into the epic (epic @ 2123166e9), worktree removed:** `FavoritesMedsSidebar/` deleted, baseline 106→86 / 20 files. `check:cascade HEAD` = 0/0/0/0 — the dead stylesheet was never bundled (tree-shaken), so zero CSS delta, not "removals only". Lesson: `workon` built this child from main; fixed with `git reset --hard origin/epic/OR-2863-design-foundation` before any work (safe only while the branch has no own commits). Dev loop for it: backend 8081 + Vite 3002 (`VITE_PROXY_HOST_URL=http://localhost:8081`). Merging into the epic triggers no CD (`maven-cd.yml` is push-to-main only); the `gh pr merge` was blocked by the auto-mode classifier ("Merge Without Review") — Ryan merges child PRs himself. Next tiny one: OR-3004. **OR-3004 DONE (PR #4633 → epic @ a377a0c3c, VIS-010 stubbed via `qa-suite/visual/feature-flag-stub.ts`).
2026-10-05: merged `origin/main` INTO the epic (merge, never rebase — shared branch, child bases, force-push);
clean, no conflicts; main only bumped webapp deps + a PABX spec; `check:cascade a377a0c3c` = 0 changes;
typecheck/guard/qa tsc clean; merge commit 0fe8e781a, gate run 37317856963 green (QA 115, visual 11/11).
Epic now 0 behind main. 2026-10-05: every open child (2404/2405/2879/2880/2991/2992/2995–2999/3000/3002/
3003/3005) got a "## Working this ticket" section (epic branch, fixed Vite port, CI-only snapshots, cascade
gate, PR base, rebase rule); OR-2977 marked as main-bound; epic description gained "Three gates" + the child
rules; canonical copy = [[or2863-child-session-sop]]. OR-2995/2996 worktrees already exist, verified on the
epic tip. Plan agreed 2026-10-05: wave 1 = 2995 ∥ 2996; wave 2 = 2997; wave 3 = 2991→2998 ∥
2992→2999; wave 4 = 3002 → 3003; own track 2404/2405/2879/2880/2977(→main)/3000; epic→main PR after wave 3.** Gate
only runs on `pull_request` + `workflow_dispatch`, so epic-branch pushes need
`gh workflow run pr-gate.yml --ref epic/OR-2863-design-foundation`; artifacts: `pr-gate-visual-snapshots`
(all actuals) and `pr-gate-test-results` (actual/expected/diff per failure); download with
`gh run download <id> -R guidedclinical/orci -n <name>` (needs -R outside a repo dir). Next: OR-2994
(shell) before any page ticket; then 2995–2999/3001 can run in parallel, each rebasing on the epic branch
after a sibling merges.

Built so far on OR-2990: `styles/surfaces.scss` (imported once
from App.scss: `.guided-page` cream ground, `.guided-panel` white card w/ border+elevation-2,
`.guided-product-mark` maroon "GuidedOR™" w/ `<sup>`, `.guided-eyebrow` small navy caps); `pages/LoginPage`
restyled (panel on cream, product mark title, full-width cyan Log in, navy-outline SSO via `--bs-btn-*` vars,
maroon focus ring via `color-mix(in srgb, var(--guided-color-accent) 12%, transparent)`, autofill override,
9rem logo under SSO); `pages/Home` rewritten as the OR-2879 draft (logged-out `/` → `/login`, LoadingUser →
Spinner; hero panel + QuickPatientLauncher + Admin Center / Test Utilities link-card grids);
`DevModeBanner` is now a labeled warning-yellow `<button>` ("Development environment · click to dismiss").
Header/Footer deliberately untouched (OR-2404's shell). Ryan's taste so far: logo small and *inside* the
card, below SSO; product mark as hero (matches guidedclinical.com/guidedor: maroon, Avenir Heavy, small TM);
quiet labels; cream page + white panels approved.

Findings: `$primary` is nearly inert in this app — 0 `.text-primary`/`.border-primary`/pills, 7 files with
links, 9 with checkboxes, 1 pagination, 22 `variant="primary"` buttons already cyan via override; flipping it
to cyan is invisible on clinical screens and cyan links fail AA (1.9:1), navy passes (15:1). `/` is the admin
front door only — Epic users enter at `/app-launch` (ProtectedRoute → `/login?next=`). DevModeBanner shows
on any host `/api/is-prod` says isn't prod. Yellow input fills on Ryan's Chrome = Dashlane, not CSS. Token
gaps surfaced: no radius scale, no display size, weights and focus color missing from the `--guided-*` map
(the color guard can't see `0.75rem`/`800` literals). Dead code: `App.scss` CRA leftovers (`.App-logo`,
`.App-header #282c34`, `.App-link #61dafb` = 2 baseline literals), `src/logo.svg` is the React atom;
`AppLaunch.scss` and `FeedbackWidget.scss` each `@import "bootstrap/scss/bootstrap"` (compiles it again).
Login isn't in the visual baseline (VIS-001–010 run after `uiLogin`) → needs VIS-011 when it ships.

See [[feedback-validation-protocol]], [[project-how-we-build-doc-review]].
