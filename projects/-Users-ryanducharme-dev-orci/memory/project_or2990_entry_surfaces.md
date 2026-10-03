---
name: project-or2990-entry-surfaces
description: "OR-2990 entry surfaces (sign-in, App Home, interstitials) — PR #4630 MERGED into epic/OR-2863-design-foundation 2026-10-02 (30f9e97b5), worktree removed; ticket left In Progress pending the VIS-006/VIS-011 baselines on the epic branch; gotchas for the next design-language child"
metadata:
  node_type: memory
  type: project
  originSessionId: 6a7b7ad6-a3c9-4607-bba7-b1cc03573d2c
  modified: 2026-10-02T19:29:22.728Z
---

OR-2990 (Story under OR-2863, In Progress) — first child on the epic integration branch. Worktree
`~/dev/worktrees/OR-2990-entry-surfaces`, branch `feature/OR-2990-entry-surfaces`, 10 commits,
[draft PR #4630](https://github.com/guidedclinical/orci/pull/4630) → `epic/OR-2863-design-foundation`
opened and **merged 2026-10-02 19:31Z into the epic branch (merge 30f9e97b5)** before the PR gate finished;
`worktree-done` ran clean. Ticket deliberately left **In Progress**: the "visual suite green with the
declared delta" criterion is unmet until the VIS-006 rebaseline and the new VIS-011 baseline are committed
on the epic branch (pr-gate `workflow_dispatch` with `update_visual_snapshots`, download the artifact,
commit the four linux PNGs). Gate run 37054374896 finished after cleanup: QA suite green, **all 11 VIS red** — every actual is 29 px taller
(1109 vs 1080) because the `/api/is-prod` localhost fix makes the DevModeBanner render in the gate environment
for the first time. Fix on the epic branch: hide `.dev-mode-banner` (`display: none`) in the visual spec's
`VOLATILE_TEXT_CSS`, then VIS-001–005/007–010 should pass against the existing baselines with no rebaseline
(the real proof the duplicate-Bootstrap removal moved nothing) and only VIS-006/VIS-011 get new PNGs.

**What shipped:** `styles/surfaces.scss` (+ `.btn-guided-outline`), restyled sign-in, App Home rebuilt
(hero + maroon person-icon account menu showing `username` and a "Client user" line when `clientUserId`
differs; per-tenant launch cards with sample patients + Patients/Templates links; "Launch by ID" button
in the Launch header opening the old QuickPatientLauncher in a modal; one `.index-panel` per admin group),
admin index as data in `components/MainNav.tsx` (Clinical Data / Configuration / Monitoring / Test
Utilities; Home and the admin `Header` navbar both render from it), `Interstitial` surface (logout, SSO
response, launch loading/error/blocked, `ErrorPage.tsx`), `Footer compact` prop (default untouched),
`DevModeBanner` dismissal keyed to `user.sessionId` in localStorage, `ServerInfoController` treats any
`localhost`/`127.0.0.1` host as non-prod (parsed via `URI`, not prefix), tokens gained radius-sm/md/lg/pill,
font-size-display, font-weight-semibold/heavy, color-focus-border, focus-ring, and the whole type scale is
published as `--guided-*`; `spec/design/tokens.md` History records it and that the product mark stays on
the system stack (Avenir is licensed). Duplicate Bootstrap compiles removed from `DosingForm.scss`,
`AppLaunch.scss`, `FeedbackWidget.scss`; CRA leftovers + `logo.svg` gone; color baseline 109/23.
`SamplePatientDto` `@NotNull` + hand-edited `types.gen.ts`.

**Declared VIS delta:** VIS-006 (admin landing) changes and needs a rebaseline via the pr-gate
`update_visual_snapshots` dispatch; VIS-011 (sign-in) is new with no baseline yet. qa-suite `uiLogin`,
`auth-login.spec.ts` and VIS-006 now wait on `.home-hero` instead of "Welcome," / `.navbar` — every UI
test logs in through that fixture, so this branch and main's fixture are incompatible until merge.
Not run locally: qa-suite e2e (8081 booted without `-Dtenants.demo.qa.enabled=true`).

**Gotchas learned:** (1) Three stylesheets `@import "bootstrap/scss/bootstrap"` — Home's rules lost to
the later copies (link-button color, dropdown caret, dropdown-header padding); fixed by importing only
functions/variables/maps/mixins. (2) `npm run generate:api` in this worktree rewrites the whole client
(installed @hey-api/openapi-ts 0.97.3 emits a different shape than the committed client) — hand-edit
`types.gen.ts` for one-field changes. (3) `OPENAPI_URL` env var redirects generate:api; the 8081 worktree
backend hot-restarts on `./mvnw -o -pl orci compile` (~20 s). (4) `git add` of a path already staged as
deleted errors "pathspec did not match", and a pre-staged index leaks into the next pathspec commit — run
`git reset` (mixed) before grouped commits. (5) The epic session rewrote OR-2990's description
concurrently at 19:08Z and created OR-2994–2997 (admin shell / patients / clinical data / platform
pages); OR-2994 owns Header+Footer styling and expects VIS-006–010 delta.

**Spun out:** OR-2991 (consolidate med-admin simulation pages), OR-2992 (unify in-case Admin Panel
ctrl+shift+a and Debugger ctrl+d; the panel is a third hand-maintained copy of the admin index).
OR-2405 narrowed to nav structure; OR-2879 narrowed to hero context strip + handbook. Header/footer on
cream deferred to OR-2404/OR-2994. Leftover harmless `quick-launcher` class on QuickPatientLauncher.

Workbench recipe that worked: Vite `VITE_PORT=3002 VITE_PROXY_HOST_URL=http://localhost:8081 BROWSER=none
npx vite` from the worktree webapp + `./mvnw -q -DskipTests install && SPRING_PROFILES_ACTIVE=local
./mvnw -pl orci spring-boot:run -Dspring-boot.run.jvmArguments="-Dserver.port=8081 -Duser.timezone=UTC"`
(JAVA_HOME = brew openjdk 25). Kill only the recorded PIDs.

See [[project-or2863-design-foundation]], [[running-a-worktree-build-alongside-the-main-local-app]].
