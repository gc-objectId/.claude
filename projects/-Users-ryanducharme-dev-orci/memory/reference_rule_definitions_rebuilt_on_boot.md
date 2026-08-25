---
name: reference-rule-definitions-rebuilt-on-boot
description: rule_definitions is not a stable catalog — RuleService.syncDefinitions() deletes and re-saves it untransacted on every boot
metadata: 
  node_type: memory
  type: reference
  originSessionId: b7394630-9c24-4cd5-8573-951edc7e6bd2
  modified: 2026-08-14T18:55:58.640Z
---

`RuleService.syncDefinitions()` runs `ruleDefinitionRepository.deleteAll()` then `saveAll()`
with **no** `@Transactional` on the method or the class, called per tenant from
`ApplicationRunner`. Two consequences for anything that reads the tenant's `rule_definitions`:

- A rule retired from code loses its row permanently, so historical rows referencing it join to
  nothing.
- Other sessions can observe the table **empty** during the rebuild window on every app boot.

So it cannot answer questions about a past event. Prefer the value stamped on the event row:
`rule_fired_results.trigger` has existed since changeset 042 and is written from the rule's own
`RuleTrigger` in `RuleFiredResult(EvaluationResult)` (via `Rule.baseBuilder`), so it is never
null on a persisted firing — confirmed populated on every stage firing, with zero disagreement
against the catalog. (OR-2734's analytics predicate was briefly changed to read it, but that
whole exemption was later dropped — see [[project_or2734_nmb_clipping_unfixed]].)

Where a query must read the catalog, give it a fallback — `mayo_shared_metric_rule_scope_v`
degrades via `COALESCE(..., rule_identifier LIKE 'a-%')`, which is why an empty catalog does not
silently break rule classification there.
