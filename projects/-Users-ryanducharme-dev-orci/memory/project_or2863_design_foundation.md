---
name: project-or2863-design-foundation
description: "OR-2863 design foundation epic — phase 1 (OR-2868 visual baseline → OR-2864 import order → OR-2869 tokens + lint) implemented 2026-09-17 on PR #4573; method, gotchas, and what phase 2 inherits"
metadata:
  node_type: memory
  type: project
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
  modified: 2026-09-17T15:49:34.701Z
---

OR-2863 (Epic, app-wide incl. clinical) centralizes GuidedOR's visual language. Children:
OR-2868 visual regression baseline (Task) → OR-2864 Bootstrap import order (Bug) → OR-2869
design record (Story) → adoption → Storybook → Bootstrap 5.3 color modes. OR-2404 (Story: admin
IA only) and OR-2405 reparented under it. OR-2879 App Home landing surface, OR-2880 rules handbook.

**Phase 1 status (2026-09-17):** all three implemented as one chain on branch
`feature/OR-2868-design-foundation`, draft [PR #4573](https://github.com/guidedclinical/orci/pull/4573),
commit order 2868 suite → 2868 CI-rendered baselines → 2864 → 2869. Tickets stay In Progress until
merge (IMPLEMENT-mode rule). Ryan's decisions: viewports 1920×1080 + 1280×800; prose doc in
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

See [[feedback-validation-protocol]], [[project-how-we-build-doc-review]].
