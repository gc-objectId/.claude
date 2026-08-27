---
name: project-or2734-nmb-clipping-unfixed
description: OR-2734 Mayo NMB clipping — FIXED and live in prod via PR 4477's rfr.trigger exemption; OR-2839 is the durable follow-on
metadata:
  type: project
---

Mayo analytics used to discard nearly every `a-nmb-reversal-extubation` firing, because
`mayo_rule_fired_results` bounded firings on `created_date <= end_time` and those are two clocks
(`created_date` = ingestion wall clock, `end_time` = clinical Anesthesia Stop). **Fixed.**

The predicate churned three times — check `origin/main` before describing its state, and re-fetch
if the checkout is more than a day old (see [[reference_stale_local_main_git.md]]):

- PR 4300 (2026-08-11) — exemption via a `rule_definitions` join. Never applied to prod's views.
- PR 4397 (mine) — swapped it to `rule_fired_results.trigger`; closed unmerged 2026-08-16.
- PR 4416 (2026-08-20) — removed the exemption entirely.
- **PR 4477 (2026-08-25) — re-landed it as `rfr.trigger = 'NOTIFICATION'`**, the form from 4397,
  with the `syncDefinitions()` reasoning in its commit body. Applied to prod; rollups refreshed.

Prod after the fix: 780 NMB firings in the base view, 764 admitted only by the exemption, 779 in
`mayo_shared_metric_firing_facts_v` (was 10). The exemption stayed narrow — only NOTIFICATION
firings clear the bound; SCHEDULED 1,754, SELECTION 306, DOSE 2, LAUNCH 1 still clipped.

OR-2734 closed Done 2026-08-26. **OR-2839** is the durable replacement: add
`rule_fired_results.evaluation_time`, backfill to `created_date`, NOT NULL so the bound stays an
indexed column, and bound the view on it — removing this trigger carve-out and also recovering the
clipped SELECTION firings. Reading `EVALUATION_DATE` out of the `details` JSON is the trap: it
costs the index-only scan, 87 ms to 3,965 ms on mgb-mgh. MGH needs the same treatment after Mayo.
