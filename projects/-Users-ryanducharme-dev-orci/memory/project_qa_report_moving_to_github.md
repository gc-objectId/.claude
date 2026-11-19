---
name: qa-report-moving-to-github
description: "Theo wants QA suite results in GitHub, not hosted by the app; OR-3203 spikes the CTRF reporter and may retire /qa-suite-report"
metadata:
  node_type: memory
  type: project
  originSessionId: fe938377-464d-4fef-812a-419d58f07f61
  modified: 2026-11-18T15:49:08.221Z
---

Do not grow the in-app QA report (`/qa-suite-report`, `orci/.../qareport/`) further without checking OR-3203 first.

**Why:** On PR #4848 (OR-3179, failure history, merged 2026-11-18) Theo said the app should not own reporting its own test results; GitHub is where CI lives. He suggested `ctrf-io/github-test-reporter` and approved #4848 only "in the meantime". Ryan agreed and OR-3203 (spike, To Do) runs the CTRF reporter next to the in-app report; if history works on the `workflow_run` trigger, the in-app report is removed.

**How to apply:** New report asks go to the spike or wait for its verdict. Known gaps to check in the spike (from the reporter's README, 2026-11-18): history matching is documented for push/schedule/dispatch/PR only, no grouping by shared error, no screenshots or traces. Related: [[pushed-alert-tests-fail-together]] (OR-3205 covers the socket test gaps, OR-3189 the GuidanceSocket cast).
