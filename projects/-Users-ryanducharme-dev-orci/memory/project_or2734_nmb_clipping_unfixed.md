---
name: project-or2734-nmb-clipping-unfixed
description: OR-2734 NMB reversal clipping is still OPEN and live in prod — the NOTIFICATION exemption was tried, then reverted; real fix is a clinical timestamp on firings
metadata:
  type: project
---

Mayo analytics still discards nearly every `a-nmb-reversal-extubation` firing, because
`mayo_rule_fired_results` bounds firings with `created_date <= end_time` and those are two
different clocks (`created_date` = ingestion wall clock, `end_time` = clinical Anesthesia Stop
timestamp). Do not assume this is fixed.

History, so it is not re-litigated:

- PR 4300 added a `rule_definitions.trigger = 'NOTIFICATION'` exemption. Never applied to prod's
  deployed views.
- PR 4397 (mine) swapped it to `rule_fired_results.trigger` — closed unmerged 2026-08-16 as
  superseded. See [[reference_rule_definitions_rebuilt_on_boot]] for why the catalog is the wrong
  source; that reasoning is still sound and worth reusing.
- PR 4416 (Theo, merged 2026-08-20) removed the exemption entirely and made the Mayo and MGH base
  views identical, moving the closed-case rule into `*_shared_metric_operations_v`. The exemption
  approach is rejected: a firing's `created_date` is not to be special-cased by trigger.

Recorded direction is to give a firing **its own clinical timestamp** rather than exempting it
from the bound. As of 2026-08-24 that work has no ticket, and OR-2734 stays open at Ready for
Testing with nothing in `main` to test.

Prod evidence 2026-08-24: 640 NMB firings, 629 clipped, 11 surviving, 10 reaching
`mayo_shared_metric_firing_facts_v`. Stage's deployed view is drifted — still carries PR 4300's
exemption — which is knowingly left alone.
