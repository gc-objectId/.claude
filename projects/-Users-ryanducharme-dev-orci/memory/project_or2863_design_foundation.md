---
name: project-or2863-design-foundation
description: OR-2863 design foundation epic — spec-driven + test-driven method, sequence, and the Bootstrap import-order defect underneath it
metadata:
  type: project
---

OR-2863 (Epic, app-wide incl. clinical) centralizes GuidedOR's visual language. Children:
OR-2868 visual regression baseline (Task) → OR-2864 Bootstrap import order (Bug) → OR-2869
design record (Story) → adoption → Storybook → Bootstrap 5.3 color modes. OR-2404 (was an
Epic, now a Story: admin IA only) and OR-2405 reparented under it; OR-2404's visual-refresh
phase and its Bootstrap-vs-Tailwind decision moved up to the epic to be settled once app-wide.

**The root defect:** `webapp/src/custom.scss:2` imports Bootstrap *before* the `$guided-*`
brand vars (lines 8-15) and the `$theme-colors` merge (line 26), so the merge is dead code —
branded utilities are never generated, which is why lines 122-149 hand-write `button-variant`
and `.bg-guided-*`. `$primary` is unoverridable, so Bootstrap blue `#0d6efd` is retyped 6x.
Correct order sits commented out at lines 4-42. Symptoms: 121 hex literals, 210 inline
`style={{}}` in 73 files, only `guided-maroon`/`guided-tooltip` reachable from TSX.
Storybook loads stock `bootstrap.min.css`, never `custom.scss`, so stories render unbranded.

**Method — spec-driven to define, test-driven to write.** The record is *executable* (token
layer + Storybook), not prose, so unlike a backend `spec/` file it cannot drift from the code;
what drifts is a component bypassing it, caught by a no-hex-literal lint. Prose is limited to
token semantics, OR-lighting legibility, contrast floors, and rationale — a paragraph
describing a button is worse than the button.

Two gates, different jobs: the lint is structural (does it go through tokens at all), visual
regression is behavioral (does it render what we meant). Every ticket declares its expected
visual delta up front — "none" or "exactly these screens"; an undeclared diff is a finding,
never a rebaseline. TDD polarity inverts for neutral refactors: capture a *passing* baseline
first rather than a failing test. Pairs with [[feedback-validation-protocol]] — a green
snapshot proves nothing until flip-and-revert has driven it red.

**Gotcha for OR-2868:** Playwright suffixes snapshots per platform, so darwin-generated
baselines fail on the ubuntu runner. Generate in CI only. `VIS` prefix is free; qa-suite has
no visual project yet and zero `toHaveScreenshot` assertions (Playwright 1.52 supports it).
Wire into `pr-gate.yml` for `webapp/**` rather than the core tier.

Open with Theodore: does the design record's prose doc live in `spec/`? The process doc puts
UI design out of scope, but tokens are *configuration* in exactly its §2 sense, with a spec
above them saying what the values mean — no new concepts needed. See
[[project-how-we-build-doc-review]].
