---
name: project-or3003-bootstrap53
description: "OR-3003 Bootstrap 5.2.3 → 5.3.8 + color modes — draft PR #4715 into the epic, gate green with no rebaseline; parity layer, per-mode tokens, dark/HC candidates; OR-3070 pins case-screen states after it merges"
metadata:
  node_type: memory
  type: project
  originSessionId: 4b7640fb-6595-4e3a-90fa-a7e479dc7ae1
  modified: 2026-10-16T16:14:27.884Z
---

**DONE 2026-10-16:** PR #4715 merged into the epic branch (f495b9ba6; commits e2e8efbf2 cascade-gate fix,
f1e852e65 upgrade, 066c9c1b7 record). PR gate run 38919218718: QA 136 passed, visual 35/35, nothing rebaselined.
Worktree removed, ticket Done. Ryan is handling the follow-up drafts below in another session.

**Decisions (Ryan, 2026-10-16):** neutral on every graded screen; inert dark + high-contrast candidates visible only
in Storybook's theme toolbar; `<html data-bs-theme="light">` + documented opt-in, no shell hook yet; legacy
`guided-primary/-secondary/-grey` theme colors deleted (unused since OR-1437, broken under 5.3).

**Shape:** `src/styles/_bootstrap-52-parity.scss` pins every 5.2 default 5.3 changed that the app renders (table
color/bg/border factor, input/check borders via new `color-border-control`/`color-border-check` tokens, addon/file
bg via `var(--bs-secondary-bg)`, tab active label `var(--bs-gray-700)`, card cap, popover header, dropdown hover,
accordion 5.2 chevrons, alert text/border at shade 40% / tint 70%) plus a mixin for the tooltip padding/arrow and
`.nav-link:focus-visible` revert. `$body-secondary-color` ← new `color-text-muted`. Tokens split: invariant on
`:root`, mode-sensitive in `$guided-color-modes` (light/dark/high-contrast) emitted per `data-bs-theme`; Bootstrap's
`$*-dark` bound to the dark tokens. `AdminTable.scss` sets `--bs-table-color` on secondary/empty cells (5.3 cell-level
color rule outranks the class). `check-cascade.sh` now `npm ci`s the base when lockfiles differ.

**Evaluation (in tokens.md):** light already misses the record's floors (control outline 1.49:1, check 1.84,
cyan/cream action outlines 2.71/1.91, muted text 4.38 on surface-muted and 4.16 on cream, chart axis 4.38). Candidates
pass everything the token layer controls; action outlines fail in HC because button variants compile literals.
Recommendation: fix light first; no separate HC mode after; dark admin/front-door only after gaps (16 direct
`--guided-brand-cream` role uses, dual-role `color-text-emphasis`, admin muted text on `color-secondary`, compiled
button variants, datepicker/toast/unthemed react-select, bitmap logos, AppLaunch global `!important` tab rules);
clinical stays light.

**Mid-flight epic changes:** the epic session rewrote OR-3003's description twice on 2026-10-16 (`--all-flips`,
cascade blind spots, then "Relationship to OR-3070": keep the epic's rendering, list clinical-selector flips in the
PR). Always re-read the ticket changelog before the close-out — a 14:06 read missed the 14:29/14:32 edits.

**Findings not yet ticketed (drafts owed to Ryan):** light contrast floors; dark prerequisites; `.guided-tooltip`
recalibration to 5.3 geometry (drop the shim); static `storybook build` renders no story ("s is not a function",
same on the epic base) and DosingFormBanner Info/Warning stories crash (missing `citations`); tech debt:
uninterpolated `--bs-tooltip-bg: $white`, Interstitial.scss emitted before Bootstrap, `.admin-table__empty` padding
never applies, dead `.sr-only` shim / `.guided-primary-blue` / DosingForm modal CSS / FeedbackWidget.scss, bare
`invalid` class hooks, `@types/react-bootstrap` 0.32, deprecated `.text-muted`.

See [[project-or2863-design-foundation]], [[or2863-child-session-sop]], [[bundle-swap-computed-style-ab]].
