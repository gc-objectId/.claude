---
name: or3078-records-cleanup
description: "OR-3078 records cleanup (design epic pre-PR fix) — DONE 2026-10-16, PR #4720 merged into the epic, worktree gone; cream semantic tokens, check:cascade resolves var(), audits, spec R-id allocation across parallel siblings"
metadata:
  node_type: memory
  type: project
  originSessionId: 74bc7ec4-c68d-4566-9c1c-a378a25ab475
  modified: 2026-10-16T16:41:02.701Z
---

OR-3078 (Task, child of the design epic): DONE 2026-10-16 — PR #4720 merged into the epic (d5a28568b) after a rebase over OR-3075/OR-3077 (spec History/Known-gap conflicts only), worktree removed. Two commits: token repoint, then records.

- Cream roles became `color-ground`, `color-surface-hover`, `color-tag`, placed in OR-3003's per-mode map (cream in every mode), which closed the dark-mode blocker "cream used directly in 16 places".
- `check:cascade` (webapp `scripts/cascade-diff.mjs`) now resolves `var()` against `:root` before comparing: a rename to an equal-valued token is not "changed", a value change shows on every consumer selector. Inline JS colors (guidedSelect.ts, TimelineEventView.tsx) are invisible to it.
- Ryan's calls: keep the approved comments (alert.page.ts visible card, MedicationService @SuppressWarnings, pr-gate.yml:218, script usage headers); Enter in Notification generates (med-admin-simulation R36); banner dismissal should outlast the session — OR-3073 rewritten to do the R38/R39 CHANGE per browser.
- Audit leftovers filed as OR-3085 (unparented, Relates to the epic, main-after-epic).

**Why:** many sibling sessions edit the same spec files at once. Next-free R-ids collide (OR-3074 and OR-3075 both took front-door R55; resolved 3075=R55/56, 3074=R57, 3078=R58/59).
**How to apply:** before taking a new R-id or VIS id, diff every sibling worktree's `spec/` and `qa-suite/visual` against the epic tip (`git -C ~/dev/worktrees/OR-NNNN-* diff origin/epic/...`) and skip ids they hold.

Gotchas: a static `storybook-static` served by `python3 -m http.server` fails every story with "s is not a function" in preload-helper — use `npm run storybook -- -p 6007` for eyes-on. `javac -Xlint:unchecked` on one file with `dependency:build-classpath` proves whether a `@SuppressWarnings("unchecked")` is needed.

See [[project-or2863-design-foundation]], [[or2863-child-session-sop]].
