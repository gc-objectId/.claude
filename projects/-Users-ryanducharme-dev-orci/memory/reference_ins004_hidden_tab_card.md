---
name: ins004-hidden-tab-card
description: "INS-004 (OR-2870) flake mechanism and fix — two fires of a-no-insulin-glucose-check each open a notification tab; expectAlert allowRepeats now filters to the visible card (PR #4706 into the epic, gate green with both fires); epic qa-suite cannot log in against a main-build 8080"
metadata:
  type: reference
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
  modified: 2026-10-15T19:29:09.067Z
---

Seen 2026-10-15 on two consecutive `workflow_dispatch` gates of the design epic head (1dc41910e), while the same
tree passed on PR #4704's pull_request gate minutes earlier. Gate log: `84 × locator resolved to hidden <div
class="mb-3 guidance-alert card" data-rule-id="a-no-insulin-glucose-check">`. App log: natural fire at launch
+1.1 s, manual `triggerScheduledRulesForCase` fire 2.3 s later, both "Published to guidance" and received.

**Why:** AppLaunch opens every NOTIFICATION_ALERT as its own tab and selects the newest; react-bootstrap keeps the
inactive pane in the DOM, hidden. `expectAlert(page, id, { allowRepeats: true })` (qa-suite/pages/alert.page.ts)
resolved `cards.first()` = the first, hidden card and waited 45 s. Passed only when the natural fire landed before
the browser subscribed (one card). Not a backend or rule problem.

**Fix (OR-2870, PR #4706 into the epic branch, 2026-10-15):** `cards.filter({ visible: true }).first()` under
`allowRepeats`; strict path unchanged; INS-004 is the only caller. Gate run 38792130646 produced both fires
(launch +1.0 s and +3.9 s) and INS-004 passed first attempt in 6.3 s. Merged into the epic 2026-10-15; ticket Done; worktree removed.

**How to apply:**
- Reproduce the page-object behavior without the app: `page.setContent` with a hidden card first and a visible
  card second, call `expectAlert` with `page.setDefaultTimeout(5000)` — node 25 runs the `.ts` directly with
  `createRequire(qa-suite/package.json)` to resolve `playwright`. Same call log as CI, red → green in seconds.
- The epic-branch qa-suite cannot run against Ryan's main-build 8080: `uiLogin` asserts `.home-hero`, which only
  exists on the epic's Home page. A real INS-004 run needs an epic build on 808N or the PR gate.
- The gate uploads `pr-gate-app-log` (app.log, docker compose tail) alongside `pr-gate-test-results` and
  `pr-gate-playwright-report`. Since OR-3067 (PR #4709, merged into the epic 2026-10-15) the QA run owns those two names and the visual run uploads
  `pr-gate-visual-test-results` / `pr-gate-visual-playwright-report`.
- A red INS-004 on an epic regate with no change near launch/guidance was this; after #4706 merges, treat a new
  red as a different cause.
