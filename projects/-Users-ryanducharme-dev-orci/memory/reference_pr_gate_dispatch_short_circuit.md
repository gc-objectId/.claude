---
name: pr-gate-dispatch-short-circuit
description: "A pr-gate.yml workflow_dispatch gets cancelled by the PR Gate Short-Circuit workflow when CI Build fails on the same head SHA — re-dispatch once CI Build has completed; the epic branch's ServerInfoController PMD violation is the usual cause"
metadata:
  node_type: memory
  type: reference
  originSessionId: 95b697e6-06ef-4315-809a-37ca066b30d1
  modified: 2026-10-14T21:11:43.488Z
---

`pr-gate-cancel.yml` (PR Gate Short-Circuit) cancels every in-progress PR Gate run for a head SHA whose
CI Build or Check Typescript run concluded `failure`. A `workflow_dispatch` on the branch has the same
head SHA as the PR, so a snapshot-capture dispatch launched right after a push dies ~10 minutes in with
"The run was canceled by @github-actions[bot]" and no artifact, even though the gate job itself was fine.

**Recovery:** wait for the CI Build run on that SHA to complete, then dispatch again. Nothing re-cancels it
because the short-circuit only fires on a CI Build conclusion.

**Why CI Build fails on OR-2863 children (2026-10-14):** PMD `AvoidUsingHardCodedIP` on
`ServerInfoController` line 17 (`Set.of("localhost", "127.0.0.1")`, from OR-2990's is-prod change). Not on
`main`; identical on OR-3045 and OR-3051 branches. Epic-branch debt to fix before the epic→main PR.

See [[or2863-child-session-sop]].
