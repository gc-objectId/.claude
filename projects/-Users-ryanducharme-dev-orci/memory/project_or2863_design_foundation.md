---
name: project-or2863-design-foundation
description: "OR-2863 design foundation epic — spec-driven + test-driven method, sequence, and the Bootstrap import-order defect underneath it"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
  modified: 2026-09-03T14:54:54.034Z
---

OR-2863 (Epic, app-wide incl. clinical) centralizes GuidedOR's visual language. Children:
OR-2868 visual regression baseline (Task) → OR-2864 Bootstrap import order (Bug) → OR-2869
design record (Story) → adoption → Storybook → Bootstrap 5.3 color modes. OR-2404 (was an
Epic, now a Story: admin IA only) and OR-2405 reparented under it; OR-2404's visual-refresh
phase and its Bootstrap-vs-Tailwind decision moved up to the epic to be settled once app-wide.
Added 2026-09-03: OR-2879 App Home landing surface (depends on 2404/2405 shell+IA; QA-runs and
analytics panels are follow-on, not in scope) and OR-2880 rules handbook (standalone, can land
before 2404; full catalog not tenant-filtered, admin-only). OR-2405's gap analysis now asks the
front-door question explicitly.

**Rules handbook grounding (OR-2880):** `GET /api/admin/rule/definitions` returns only 5 fields
(id/description/type/trigger/configBehavior). The 13-column xlsx from `RuleDefinitionExporter`
(prompt title/description, accept/reject text, reject reasons, citations, warning text, guidance
category) comes from `rule.createPrompt(emptyMap)` + `CitationService` and is exposed nowhere —
so a richer read endpoint is required, not just a page. `pages/Home.tsx` at `/` is a 27-line
stub (welcome + QuickPatientLauncher).

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

**OR-2864 is neutral by construction (proved 2026-09-03 on the epic POC branch):** compiled
current vs reordered `custom.scss` (Bootstrap 5.2.3) and diffed — 0 existing rules changed,
258 lines added (guided-{primary,secondary,grey} custom props + generated utilities). One
collision: generated `.bg-guided-secondary` (`!important`) beats the hand-written one at
line 131, same color → delete the manual rule. `$primary`/`$secondary` and the hand-written
`.btn.btn-primary`/`.btn-secondary` overrides must stay in 2864 — overriding `$primary` recolors
every `.text-primary`/focus ring/nav-pill and is a phase-2 declared delta. The compiled-CSS
diff is the cheap structural gate that runs before snapshots. Ticket description updated.
Epic branch `epic/OR-2863-design-poc` is parked with no commits; phase 1 (2868→2864→2869) runs
as normal ticket branches, epic branch is for phase 2 look-and-feel play. Reordered variant
recipe: `functions` → `$guided-*` → `variables` → merge → `maps`… → `utilities/api`.

**Gotcha for OR-2868:** Playwright suffixes snapshots per platform, so darwin-generated
baselines fail on the ubuntu runner. Generate in CI only. `VIS` prefix is free; qa-suite has
no visual project yet and zero `toHaveScreenshot` assertions (Playwright 1.52 supports it).
Wire into `pr-gate.yml` for `webapp/**` rather than the core tier.

Open with Theodore: does the design record's prose doc live in `spec/`? The process doc puts
UI design out of scope, but tokens are *configuration* in exactly its §2 sense, with a spec
above them saying what the values mean — no new concepts needed. See
[[project-how-we-build-doc-review]].
