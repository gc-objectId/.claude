---
name: project-automation-backlog-vetting
description: "The jira-watch coverage backlog: drained 2026-11-17 from 183 open to 21 writable, why the other 162 died, and the rubric the loop now applies in-run"
metadata:
  node_type: memory
  type: project
---

The coverage backlog (`~/.claude/jira-watch/bin/automation.sh`) reached 252 proposals with 3 ever
written. Ryan vetted 37 across three sittings (2026-08-26, 08-31, 09-25) and declined 34.

**2026-11-17: drained.** Six agents judged all 183 open proposals against the `write_now` rubric,
read-only against `main` — no worktrees, no builds, no environments. **21 kept, 162 declined**, every
decline recorded with a reason. All six slices independently landed at 80–94%, matching Ryan's own
rate. Why they died, by rubric bar:

- **83 — already covered (bar 2)**, overwhelmingly by the test that shipped in the fix's own PR
- **42 — plumbing, not behaviour (bar 4)**: golden tables, log strings, a third restatement of a sibling
- **22 — home never runs (bar 1)**: proposed into a `*IntegrationTest` class
- **17 — cannot be shown red (bar 3)**: no control, or vacuous against shipped data

**The lever was culling, not grouping.** Grouping 183 proposals by destination file looked like it
would collapse the PR count; it did not — only 37 of 82 groups were real destinations, the rest fell
back to the source ticket. After judging, 21 survivors split by what they need: **12 backend (mvn,
no app) and 9 qa-suite (one environment)** — two PRs, not twenty. Judging first is also the cheapest
step, so `drain.sh` now judges in a detached worktree before buying an image or an environment.

**The inflow was the real defect.** The dominant decline reason is coverage that arrived with the
fix, because the validating session never opened the PR's own test diff. `validate.md` bar 2 now
requires reading it first. Bar 1 was also wrong and is corrected — see
[[reference-integration-test-naming-excludes-from-ci]].

**Why:** coverage written after a ticket closes never gets written — the environment and worktree
that made it cheap are gone, and the proposal competes with live work.

**How to apply:** the loop writes `write_now` proposals in-run (runner step 12, between the gate and
the teardown trap, holding only the worktree via `keep_worktree`), gated by `automate-gate.sh`,
landing as a draft PR. `drain.sh` works any older backlog. Judge against the rubric, not against
"would a test here be nice". Byproduct of this pass: [[project-or3200-config-import-wipe]].
