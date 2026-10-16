---
name: project-or2863-design-foundation
description: "OR-2863 design foundation epic — phase 1 (2868/2864/2869) merged 2026-09-30; phase 2 look-and-feel underway on the epic integration branch (login, App Home, dev banner, shared surfaces); branching model, findings, token gaps"
metadata:
  node_type: memory
  type: project
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
  modified: 2026-10-15T17:40:00.000Z
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
epic tip. **2026-10-14 resume:** epic @ 473615ea1 (50 ahead / 80 behind main); the three 10-05 gate runs died in the
GitHub Actions outage, never re-run. OR-2997 draft PR #4640 (head 036a6a342, 6 commits) is MERGEABLE/CLEAN with
gate SUCCESS, awaiting Ryan's merge — merge it BEFORE merging main. A trial `git merge origin/main` conflicted
in 7 files and was aborted: (a) OR-3004 was ALSO merged to main as #4645 (c49fd43a0) — same fixture, different
commits → spec/md/feature-flag PNG conflicts; resolve by keeping the epic's side (superset + epic-look PNGs);
(b) main's #4622 (patientservice migration) edited MedicationList/PatientList/ViewPatient (41/29/79 lines) that
2995/2996 restyled → real 3-way merge: keep the epic layout, take main's service/API changes, then typecheck +
check:cascade + regate. **Done 2026-10-14:** #4640 merged (epic @ f0dbfdceb), then main merged → 8bc1b8be9. Resolution: qa-suite
files `--ours` (epic superset); the 3 pages = epic JSX + main's `@api` controllers/DTOs (MedicationList fetch
via `MedicationsController.getFullDetailsMedications`, dropped main's dead category-options block;
`PaginatedView<PatientDto>`; `patient.gender ? formatGender(..) : "—"` since the DTO makes gender optional).
Typecheck/guard/qa tsc clean, `check:cascade f0dbfdceb` = 0/0/0; gate run 38582115891 green on 8bc1b8be9
(QA 115, visual 27/27 — VIS-001–027 now). **OR-3005 DONE 2026-10-14** (#4681 → epic @ 2b17f4a96, merge tree == gated PR head, 0 behind main, 61 ahead).
**Spec-driven audit 2026-10-14 (Ryan asked):** tokens ARE kept in the record — every new token (radius, display,
weights, focus) was documented by its child and `spec/design/tokens.md` was touched by 2990/2994/2996/2997; spec
lint runs in maven-ci. NOT in any record: the shared surfaces/components (`.guided-page/-panel`, product mark,
`AdminPage`, `AdminPageHeader`, `AdminTable`, `FactList`, `SectionHeader`, the navy-outline button rule,
`clinical-shell` scope) — the record is tokens-only until OR-3002 (Storybook = the executable component half).
`reviewed: false` still (never reviewed by Theo). No `spec/features/` on the epic; 2991 and 2992 are behavior
changes → tickets now say `/feature-spec` first (templates exist in docs/templates). Page tickets so far were
prose briefs + declared deltas, not "diffs against the record" (nothing to diff against). Ryan agreed 2026-10-14 →
**OR-3043** created: baseline feature specs `front-door.md`, `admin-shell.md`, `event-center.md` on the epic
(OR-3017 conventions: EARS + permanent ids, evidence ledger Tested/Code only/Suspect, test names carry ids,
spec-only PR, Theo/Alex approve; header notes it baselines the epic branch and becomes true of main at the
epic PR). Every open child now has a "## Record" section: behavior tickets (2991, 2992, 2879, 2880, 2404) =
`/feature-spec` first as a CHANGE against a 3043 baseline or a new spec; visual tickets (2998, 2999, 3003,
3000) = diff against design record + Storybook; 3002 = the rendered record + adds the surfaces section to
`spec/design/tokens.md` + sends the record to Theo (`reviewed: false`). Epic description: "Two records, by
what a ticket changes"; sequence step 5 = 3043 ∥ 3002, step 6 = 2991→2998 ∥ 2992→2999, step 7 = 3003.
Ordering: 3043 ∥ 3002 (independent files) → 2991/2992 (need 3043) → 2998/2999 (need 3002).
Wave 3 runs as two workon *chains* (shared code path → one branch, one PR each): `workon OR-2991
simulation-pages` + `/workon OR-2991 OR-2998` (port 3006) ∥ `workon OR-2992 in-case-overlay` +
`/workon OR-2992 OR-2999` (port 3008). Then wave 3 (2991→2998 ∥ 2992→2999) with 3005 between.

**Wave 1 DONE 2026-10-05:** OR-2995 (#4635) and OR-2996 (#4636 + #4637 rebaseline) merged into the epic
(@ 8567a6a07, 49 ahead of main); shared AdminPageHeader/AdminTable/FactList/SectionHeader now exist for 2997;
VIS-012–018 added (next free VIS-019). Lesson from 2996: open the draft PR only after the rebaseline PNGs are
committed — Ryan merges drafts fast. Epic session merged main again + regated. Plan agreed 2026-10-05: wave 1 = 2995 ∥ 2996; wave 2 = 2997; wave 3 = 2991→2998 ∥
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

**2026-10-14 later: 3002 (#4682) + 3043 (#4683) merged; main merged again → epic @ 39115be72, clean, cascade
0/0/0, 0 behind main.** 3043 baselined `spec/features/{front-door,admin-shell,event-center}.md` and spawned 7
Suspect follow-ups: OR-3045 home shows Patients/Templates row links to non-admins (R21), OR-3046 launch-by-ID
silent no-op for non demo-demo/MGB tenants (R28–30), OR-3047 endless spinner when the sign-in check fails with
a non-401 (R48–49, admin-shell R3), OR-3048 signed-in non-admin → admin page redirect loop (pre-dates epic,
admin-shell R2 / front-door R3), OR-3049 Event Center index blurb wrong "inspect and replay" (R25/R27),
OR-3050 Event Center "Sent" toast for unknown/empty case (R20/R22, backend logs + drops), OR-3051 dead navbar
menu code from 2994 (no visual delta). All are CHANGE tickets against the new baselines = first real pass of
the spec-driven loop. Triage: 3045/3047/3048 are front-door/auth bugs reachable from the epic's own home page
→ must land before epic→main; 3049/3051 trivial; 3050 needs backend; 3046 needs a product decision.

**OR-3002 PR #4682 MERGED into the epic 2026-10-14 (13f9d8543)** (Storybook on the app stylesheets, 22 stories, Surfaces section in the record; see [[project-or3002-storybook-real-theme]]). Epic is 8 behind origin/main again (16511b8fb) — merge main into the epic before the next regate.

**2026-10-14 evening: 3049 (#4684) + 3051 (#4688) merged → epic @ 3f2d9a9b3, 2 behind main; Vite 3001 restarted
on it (PID in scratchpad `vite-epic-3001.pid`); gate dispatched = run 38632473604, GREEN (QA 115, visual 27/27).** Epic description now has step 6
"Baseline fixes" (3045/3048/3047 chain, 3046, 3050 Pending; 3049/3051 Complete) and steps 7/8 renumbered. All five
open fix tickets carry Record + Working-this-ticket blocks (ports 3016 chain / 3017 3050 / 3019 3046). Child
sessions are ahead of the plan: chain PR #4689 is OPEN into the epic (spec commit + code commit, AUTH-005–009);
3050 has a593d95ca pushed and is waiting on the VIS-024 CI PNGs before its PR. OR-3046 rewritten to Ryan's intent
(launch every listed tenant by the one launch address, surface the server's reason); it is To Do and unassigned.
Spec README rule: spec edit ships in the SAME PR as the code — my earlier "spec PR first" wording was wrong and is
fixed in the tickets and the SOP. Next: merge #4689 and 3050's PR → pull, merge main, regate → wave 3
(2991→2998 ∥ 2992→2999, each starting with /feature-spec) → 3003; Theo reviews `spec/design/tokens.md` before epic→main.

**2026-10-15: #4690 (OR-3050) and #4689 (3045/3048/3047 chain) merged into the epic; all four Done by their
sessions. main merged in (clean, 8 commits incl. release 0.1.102) → epic @ 0e410c561, 0 behind main; Vite 3001
restarted on it; gate dispatched = run 38745784899.** OR-3045 worktree still present (child session owns
`worktree-done`); OR-3050 worktree gone. Epic step 6 now Complete except OR-3046 (To Do, unassigned, port 3019).
Wave 3 is next: `workon OR-2991 simulation-pages` (port 3006, then 2998) and `workon OR-2992 in-case-overlay`
(port 3008, then 2999), OR-3046 can run beside them; both 2991 and 2992 touch InAppAdminPanel, so whichever
merges second rebases. Each starts with /feature-spec.

**2026-10-15 close-out plan (Ryan approved all):** epic "Done when" added (steps 6–8 merged + gate green,
`tokens.md` reviewed: true by Theo, epic→main merged + dev deploy); step 9 "Land". OR-3003 stays in the epic.
**New epic OR-3054 "Admin information architecture and landing surfaces"** now parents OR-2404/2405/2879/2880;
their Working blocks rewritten to branch from/PR into `main` (no reset, `gh pr create --draft`, cascade vs
`origin/main`), "Depends on: OR-2863 merged to main"; OR-3054 ↔ OR-2863 linked Relates. OR-3000 (deferred) and
OR-2977 unparented and linked Relates to OR-2863. Ryan deleted the 11 redundant child "relates to" links on OR-2863 by hand (no MCP
delete-link tool; a REST script with the keychain token is classifier-blocked). Gate 38745784899 on the epic head 0e410c561: QA 120 pass, visual 28/29 — VIS-029
has no baseline because #4689 merged before its PNGs; the 3045 session owns that follow-up (its baseline run
38745241621 is green). Wave 3 started by Ryan (2991 + 2992 worktrees). Created OR-3055 (straight to main, no parent): in-case "Scanner setup" shows the
scanner-configuration barcode full screen (Honeywell 1962H is CURRENT per SharePoint "Scanner & Labels"; the
barcode asset itself not yet located, open question on the ticket).

**2026-10-15 afternoon: wave 3 landed.** #4700 (VIS-029 baselines), #4701 (OR-2992), #4702 (OR-2991+OR-2998)
merged into the epic → f11c4621a, 0 behind main; Vite 3001 restarted (PID in scratchpad `vite-epic-3001.pid`).
OR-2991/2992/2998 Done by their sessions; remaining children: OR-2999 (To Do, Ryan, port 3009), OR-3046 (To Do,
unassigned, port 3019), OR-3003 (To Do, unassigned, port 3011). Epic Sequence/Gates updated (VIS-001–033; step 7
= 2999 Pending). OR-2999 description refreshed (2992 merged, VIS-030/031 capture the overlay, next free VIS-034);
OR-3003 "step 8"; both got the comment rule. **Two epic-wide CI Build breakers fixed directly on the epic**
(commits 3c3faa999 + b68a373da, pushed): `event-center.md` context listed the deleted InAppAdminPanel.tsx (spec
lint error on every child PR) → now InCaseOverlay.tsx; PMD AvoidUsingHardCodedIP on ServerInfoController's
`"127.0.0.1"` → `InetAddress.getLoopbackAddress().getHostAddress()`. Local `-o` PMD reports 15 UnnecessaryImport
P4s that are offline-classpath artifacts, not real. Gate 38776567218 ran on f11c4621a; a second dispatch on
b68a373da follows it (same-ref dispatch cancels the in-progress one). Unfiled follow-ups from the 2991 session:
standalone `/admin/simulation` `/api/medications` call carries no tenant (R15 text shows); VIS-032 sits before
VIS-031 in visual-regression.spec.ts. Four feature specs are `reviewed: false`; only `spec/design/tokens.md`
gates the epic.
Gate 38776567218 on f11c4621a GREEN (QA 132, visual 33/33); gate 38778721742 dispatched on b68a373da. Ryan asked
about the dev banner: 3001 shows none because 8080 is a main build whose is-prod list only has localhost:3000;
no test anywhere for R36–R39/R47 → **OR-3061** (Task under the epic, port 3020 + own backend, "later"):
@WebMvcTest for ServerInfoController + AUTH smoke for banner show/dismiss + ledger update.
Gate 38778721742 on b68a373da (CI Build fixes) GREEN: QA 132, visual 33/33 — epic head is clean. 2991 session had
filed OR-3063 (same spec-path fix; closed Done by me with the commits) and OR-3062 (standalone Single mode
medication list has no tenant; predates the epic, same call on main; recommended to Ryan: unparent to related,
work from main after the epic lands; decision pending). Ryan started OR-3046 (PR #4704, first child cut after the
fix → CI Build runs) and an OR-2999 worktree.
OR-3046 PR #4704 merged → epic 1dc41910e (0 behind main), Vite 3001 restarted, gate 38781035911 dispatched.
3046 session filed OR-3064 (Task under the epic: unknown demo patient launch answers 500 with `PatientId[value=…]`
in the message; front-door R43/R53, LAUNCH-009). Ryan: follow-ups from 3046/2999 stay as filed; organize the
backlog (3061, 3062, 3064, …) after OR-2999 lands, then do them in sequence.
Gate on 1dc41910e: runs 38781035911 and 38783487900 red on INS-004 only (OR-2870 mechanism, see
[[ins004-hidden-tab-card]]; diagnosis commented on OR-2870), third run 38786379073 GREEN (QA 134, visual 33/33).
Epic head 1dc41910e is clean. Waiting on OR-2999; backlog pass after it lands: OR-3061, OR-3062, OR-3064, plus
OR-2870 (costs a 20-min rerun per epic regate) and the gate-artifact gap (not ticketed).

**2026-10-15 evening: OR-2999 landed** (#4705 → epic ba841f779, 0 behind main; VIS-034/035 added, next free
VIS-036; tokens.md gained the chart series palette, still `reviewed: false`). Vite 3001 restarted; gate
38789553978 dispatched. 2999 session filed OR-3065 (graphical Timeline, Story) and OR-3066 (scope AppLaunch.scss
nav-link overrides, Task), both unparented, main-after-epic, already linked Relates to the epic. I pushed
`OR-2863: Order VIS-031 before VIS-032` on the epic (needs the next regate to be "head green").
**Organized backlog (Ryan: "do those all in sequence"):** epic Sequence now 8 = OR-3064 → OR-3061 → OR-3062,
9 = OR-3003, 10 = epic→main. OR-3064 retyped Task→Bug and given Record + Working block (port 3022 + own backend);
OR-3062 kept in the epic (Ryan did not take the unparent suggestion), Working block port 3021. Ports in the SOP
table. Still unticketed: OR-2870 fix (page-object one-liner) and the gate-artifact overwrite gap.
Ryan: "ticket the remaining items, they are part of this epic" → OR-2870 reparented under the epic with the
confirmed mechanism + fix (`cards.locator("visible=true").first()`), port 3023; new **OR-3067** (Task, epic):
pr-gate uploads test-results/playwright-report once at the end, the visual run wipes the QA run's output. Epic
step 8 now: OR-2870 → OR-3067 → OR-3064 → OR-3061 → OR-3062; step 9 OR-3003; step 10 epic→main.
Gate 38789553978 on ba841f779 (2999 head): QA 134 green, visual 34/35 — **VIS-030 1280x800 failed, 23640 px**:
the mask over `.in-case-overlay__case .tab-content` was ~24 px taller than in the baseline (a mask hides pixels
but follows the element's box), so the Patient Demographics pane's height varies between CI renders; same tree
passed PR #4705's own gate minutes earlier. Demographics are live createPatient data, not stubbed (overlay-stub.ts
stubs only allergies + tracked values). Draft ticket shown to Ryan; not yet created. Artifact dir:
scratchpad/gate-38789553978-results (actual/expected/diff + trace.zip).
Ryan "go" → **OR-3068** created (Task, epic, port 3024): VIS-030 Patient Demographics pane height varies; stub
demographics or wait for the last row, rebaseline once. Epic step 8 = OR-2870, 3067, 3068 (gate reliability),
then 3064, 3061, 3062; Ryan runs them in parallel sessions (3064 already started), rebasing as siblings merge.
Gate 38791694089 dispatched on ae1e6b191 (VIS reorder head) by the chained watcher.
Gate 38791694089 on ae1e6b191 (2999 + VIS reorder) GREEN: QA 134, visual 35/35 — VIS-030 passed this time,
confirming OR-3068 is a flake not a regression. Epic head ae1e6b191 is clean. Ryan has parallel sessions for
2870, 3067, 3068, 3064, 3061, 3062; next trigger = each merge (pull, restart 3001, regate), then 3003.
**OR-3067 (gate artifacts) DONE 2026-10-15: PR #4709 merged into the epic (6629d6d7a), worktree gone.** Fix is per-step
uploads in pr-gate.yml only: QA step uploads `pr-gate-test-results`/`pr-gate-playwright-report` right after
`npm run gate`; visual step uploads `pr-gate-visual-test-results`/`pr-gate-visual-playwright-report` (guarded like
the snapshots upload); summarize-visual-failures.mjs + tests-readme name them. Validated on dispatch 38792671899
with a throwaway smoke-launch failure (dropped before the PR): QA artifact had test-failed-1.png + trace.zip, visual
artifact had 35 dirs. That run also hit the OR-3068 VIS-030 flake (one-row mask height, 36432 px at 1920x1080).
Auto-mode classifier blocks read-only Bash calls batched in the same response as a `git reset --hard`; send them separately.

**2026-10-15 late: step 8 landed except 3068.** #4708 (3064), #4706 (2870), #4709 (3067), #4707 (3061), #4710
(3062) merged → epic a995d5716, 0 behind main, spec lint clean, Vite 3001 restarted, gate 38799020434 dispatched.
Open children: OR-3068 (In Progress, Ryan's session) and OR-3003 (To Do). Epic Sequence updated. Next: 3068 merge
→ regate → merge main into the epic → OR-3003 (port 3011) → Theo tokens.md review → epic→main PR.
**Ryan 2026-10-15: spec sign-off does not gate.** The epic→main PR is the only real gate: Alex, Karen, Theo and
Jordan look at the env and agree before merge; specs/tokens.md may be reviewed in that PR, `reviewed:` flags are
non-blocking. Epic "Done when" rewritten accordingly; "design record review — Pending" dropped from step 5.
Gate 38799020434 on a995d5716: QA 136/136 green (INS-004 fixed by 2870), visual 34/35 — VIS-030 again (OR-3068
flake, fix in flight in Ryan's session). No rerun; the 3068 merge regate is the next green.

**2026-10-15 night: OR-3068 merged (#4711) → epic a8d76b382, 0 behind main; step 8 Complete** (all six Done).
Vite 3001 restarted; gate 38801773974 + first-ever CI Build of the integrated epic head (38801778424) dispatched.
OR-3003 worktree exists on its main cut (clean, reset pending), assigned to Ryan; ticket refreshed (step 9,
VIS-001–035). Epic diff vs main: 292 files (+12k/-6k), 31 child merges, **no Liquibase changesets, no
application*.yml changes**; package.json changes are scripts only. Backend touches Mayo + MGB GetPatient commands
(OR-3064) — review those carefully. Launched read-only pre-PR review workflow wf_9f226e02-9e0 (4 dimensions:
backend, frontend, clinical safety, records/hygiene → adversarial verify → completeness critic).
**Reviewer env for the epic→main PR (Ryan's call, pending):** `maven-cd.yml` (Build And Deploy to Dev) has no
branch guard → `gh workflow run maven-cd.yml --ref epic/...` builds the epic image and deploys it to dev, and
qa-suite.yml's workflow_run then runs the FULL suite (incl. @external Mayo) against it. Main pushes redeploy main
(concurrency dev-deploy, cancel-in-progress) → freeze main merges for the window or redeploy the epic tag with
`deploy.yml` (Deploy to ECS: environment + version tag). No migrations → dev flips epic↔main DB-safe. Stage last
deployed 2026-08-06; deploying there would also run ~10 weeks of main's migrations on stage → not recommended.
**Epic head a8d76b382 fully green:** PR Gate 38801773974 (QA 136/136, visual 35/35 — VIS-030 and INS-004 both
stable now) and the first CI Build of the integrated epic, 38801778424 (build incl. spec lint + Java tests, and
static-analysis PMD + SpotBugs, both success). Pre-PR review workflow wf_9f226e02-9e0 still running.
