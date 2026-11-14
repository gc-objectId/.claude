---
name: project-automation-backlog-vetting
description: "The jira-watch coverage backlog as of 2026-11-13 — what was declined and why, and the rubric the loop now applies in-run"
metadata:
  node_type: memory
  type: project
  originSessionId: 8f64a84a-629e-4548-8435-e2d0830179b0
  modified: 2026-11-13T19:48:34.399Z
---

The coverage backlog (`~/.claude/jira-watch/bin/automation.sh`) reached 252 proposals, 215 open, 3
ever written. Ryan vetted 37 of them across three sittings (2026-08-26, 08-31, 09-25) and declined
34 — a ~92% decline rate, which is the real signal: **the backlog was mostly noise, and the vetting
pass was the valuable part.**

**2026-11-13:** declined 30 more by category — analytics/reserved (Alex owns), build-or-CI changes
the coverage gate refuses, duplicates and absorbed siblings, Playwright tests asserting intermediate
loading states behind delayed routes (timing races over cosmetic behaviour), CDP `fromDiskCache`
assertions, and tests for one-shot Liquibase changesets that have already run everywhere. 183 open
across 67 tickets after that.

**The remaining backlog is mostly legitimate** — positive/negative clinical-rule pairs with explicit
controls. It was never a quality problem; it was that nobody drained it. The efficiency lever is
grouping, not more culling: proposals collapse by destination file (LAMD = 4 tickets → one spec,
INS = 3, `MayoHL7SiuCaseSchedulingProcessorTest` = 2), so draining by file rather than by ticket
cuts the PR count several-fold.

Two structural defects found, both now addressed:

- **Proposals named colliding qa-suite ids** (four tickets each proposed `LAMD-002`) because each
  session read only the repo. `~/.claude/bin/test-id.sh` reserves ids under a lock.
- **~22 proposals could only live in a `*IntegrationTest` class, which nothing runs.** See
  [[reference-integration-tests-never-run-in-ci]].

**Why:** coverage written after a ticket closes never gets written — the environment and worktree
that made it cheap are gone, and the proposal competes with live work.

**How to apply:** the loop now writes `write_now` proposals in-run (runner step 12, between the gate
and the teardown trap), gated by `automate-gate.sh`, landing as a draft PR. The rubric lives in
`prompts/validate.md` under "Which proposed tests get written". `drain.sh` works the older backlog
by destination file. Judge proposals against that rubric, not against "would a test here be nice".
