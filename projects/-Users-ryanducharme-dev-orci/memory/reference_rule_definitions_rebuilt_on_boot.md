---
name: reference_rule_definitions_rebuilt_on_boot
description: rule_definitions is upserted on boot and never pruned; a rule retired from code keeps its catalog row forever, so never classify a past event from it
metadata:
  type: reference
---

`RuleService.syncDefinitions()` runs per tenant from `ApplicationRunner` on every boot. As of
2026-10-14 it is **upsert-only**: it syncs rows whose id matches a registered rule and inserts
the missing ones, but never deletes. (An earlier version did `deleteAll()` + `saveAll()`; that
is gone, so the "table empty during the rebuild window" hazard no longer applies.)

Consequences for anything that reads a tenant's `rule_definitions`:

- A rule retired from code **keeps its row** (seen with `a-known-procedure-missing-antibiotic`
  after OR-2944 removed the class). The engine and `/api/admin/rule/definitions` read the
  registered beans, not the table, so they disagree with the table by exactly those rows.
- Analytics that join to the catalog will still see retired rules as "defined".

So it cannot answer "is this rule live" or classify a past event. Prefer the value stamped on
the event row: `rule_fired_results.trigger` has existed since changeset 042 and is written from
the rule's own `RuleTrigger` in `RuleFiredResult(EvaluationResult)` (via `Rule.baseBuilder`), so
it is never null on a persisted firing.

Where a query must read the catalog, give it a fallback — `mayo_shared_metric_rule_scope_v`
degrades via `COALESCE(..., rule_identifier LIKE 'a-%')`. See also
[[project_or2734_nmb_clipping_unfixed]].
