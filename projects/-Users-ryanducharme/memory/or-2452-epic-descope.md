---
name: or-2452-epic-descope
description: "OR-2452 (ephemeral PR envs epic) was rewritten trunk-based on June 10 2026, then the team meeting invalidated its premises — pending descope; check epic status before building on it"
metadata: 
  node_type: memory
  type: project
  originSessionId: c76675ad-3acb-4958-ae3c-8e19426c5768
---

On June 10 2026 the OR-2452 epic (ephemeral per-PR envs + branch model overhaul) was rewritten around trunk-based development (incl. new story OR-2589 for release tagging). Hours later, the meeting with Theo and Jordan revealed the epic's premises were wrong: the team already works trunk-based with tagged releases ([[guidedor-release-process]]), the full suite takes ~8 min (not "too slow to gate"), stage is client-facing and must stay stable (the rewrite had it churning per merge), and OR-2589 largely duplicates the existing maven-release tag process.

Real pains voiced in the meeting (the parts worth keeping): (1) QA signoff happens after merge — Theo open to Definition-of-Done including QA tests; (2) release-prep merge coordination is manual/opaque — Jordan almost merges during releases; (3) Ryan wants a controlled place to run regression against a release candidate — Theo suggested staging as stopgap or a single on-demand "playground" env targeting an image.

**Why:** Ryan proposed big-team branching machinery out of habit and couldn't articulate the problem in the meeting. On June 10 2026 the epic and children were CLOSED (OR-2494 and OR-2507 left for Ryan to close manually after a permission block). OR-2508 (report upload key) was made standalone/parentless — Ryan will pick it up later; note the QA report is still flaky even after moving storage to S3. Replacement work: OR-2585 (suite organization: tag tiers, family reorg) and OR-2590 (full suite vs staging on RC deploy as the release gate).

**How to apply:** Don't cite the OR-2452 epic description as direction — it's closed. The agreed run-point model: full suite vs dev every merge, full suite vs staging per RC deploy (OR-2590), smoke vs prod post-deploy.
