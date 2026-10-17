---
name: bundle-swap-computed-style-ab
description: "Prove a stylesheet change visually neutral: swap two production CSS bundles on the same live DOM, diff every computed property and element box under CDP-forced states"
metadata:
  node_type: memory
  type: reference
  originSessionId: 4b7640fb-6595-4e3a-90fa-a7e479dc7ae1
  modified: 2026-10-16T15:10:39.033Z
---

Used for OR-3003 (Bootstrap 5.3 upgrade); stronger than `check:cascade` because the browser resolves the cascade,
so shorthand-vs-longhand overrides and cross-class ties show up as real values.

**Recipe:** build both bundles with `vite build` (base from a `git worktree add --detach` of the base ref with its
own `npm ci`), serve the two `.css` files on a local port, then in headless Chromium (qa-suite's `playwright`, via
`createRequire(qa-suite/package.json)`): load the real page, disable `link[rel=stylesheet]` and
`style[data-vite-dev-id]` (keep emotion/goober runtime styles), prepend `<link id=ab-bundle>`, inject
`*{transition:none!important;animation:none!important}`, collect `getComputedStyle` for every element plus
`::before/::after/::placeholder` and `getBoundingClientRect`, swap the href, collect again, diff. Repeat with states
forced via CDP `CSS.forcePseudoState` (hover, focus, focus-visible, active) and class toggles (`is-invalid`,
`is-valid`, `active`, disabled).

**Pitfalls:** freeze `page.clock.setFixedTime` first (the clinical footer clock and timeAgo otherwise diff);
computed styles miss position shifts, so always compare rects; screenshots taken without the transition freeze catch
buttons mid-fade and look like regressions; collapses inside `.visually-hidden` (the dosing form is kept hidden while
an alert shows) don't paint; the static `storybook build` output renders nothing, so use `storybook dev`. Login as
admin/admin on the epic Vite port; app-launch lands on the vital-sign opt-in tab, so click
`#tab-navigation-tab-HOME_TAB`; the Settings modal has a `d-none` tab; repeated runs leave a Restore Meds prompt.
The Bash hook rejects any command text containing `process.env` — pass flags as argv.
