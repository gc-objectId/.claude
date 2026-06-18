---
name: feedback-npm-script-test-commands
description: "Provide qa-suite test commands as npm :local scripts with -- pass-through, not raw TEST_ENV=local npx playwright"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 545d0b63-38da-44be-9c99-72528ddec965
---

When providing qa-suite validation commands to Ryan, use the npm script variants — `npm run test:local`, `core:local`, `full:local`, `smoke:local` (or `TEST_ENV=local npm run <module>` for modules without a `:local` variant) — with extra Playwright flags after `--`, e.g. `npm run test:local -- --grep "ARD-001" --project=clinical-rules --no-deps`. Never hand him raw `TEST_ENV=local npx playwright test ...` commands. (Ryan, 2026-06-12.) Note: the full-suite script is `full` (renamed from `sweep` in OR-2585 — Ryan and Theo both disliked "sweep").

**Why:** Ryan prefers the npm-script form and had drifted to raw commands only because he thought `test:local` had stopped working (the actual gotcha: it needs `npm run test:local` — `npm test:local` is silently not a command).

**How to apply:** In step 3 of the ticket flow (provide validation commands), compose env × module × tier × test via npm scripts + `--` pass-through. Don't append a second `--grep` to `core`/`core:local` (one is baked in); use a `test:*` or `full:*` variant for custom greps. Related: [[feedback-git-pr-workflow]], [[feedback-validation-protocol]].
