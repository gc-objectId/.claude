---
name: project-or2862-allergy-reaction-paren-drift
description: OR-2862 — Mayo Epic reaction picklist drift silently drops allergy severity; exact-match lookup, naive paren-stripping is unsafe
metadata:
  type: project
---

OR-2862 (Bug, To Do, filed 2026-08-31): Mayo Epic returns `AllergyIntolerance`
manifestation text as `TERM (lay description)`. `GetAllergiesR4Command` uppercases it
raw, then `AllergyReactionRepository.findByReaction` matches **exactly** against the
seeded list. A mismatch skips the reaction with no log line, leaving the severity
multimap empty so `getMaxSeverity` returns `OTHER_UNKNOWN` and
`highestSeverityAllergyReaction` is null. Confirmed on dev: Wilfredo (PMRN 11292547)
gentamicin reads `HIVES (RAISED, ITCHY, SKIN WELTS)` → `OTHER_UNKNOWN` instead of
`MODERATE`.

**Why:** the seed CSV mirrors Epic's picklist and *already* stores parenthesized forms
for 7 entries (`OTHER (SEE COMMENTS)`, `RASH WITH MUCOSAL LESIONS (SJS, TENS)`,
`DERMATITIS (ALLERGIC CONTACT DERMATITIS)`, …). So this is picklist drift on individual
rows, not a format mismatch across the board — which makes a blanket fix wrong.

**How to apply:** never "fix" this by stripping parentheticals unconditionally —
`RASH WITH MUCOSAL LESIONS (SJS, TENS)` would strip to an unseeded term and lose
`TYPE_II_TYPE_IV`. Exact match first, *then* strip-and-retry, then fuzzy. The existing
`tryFuzzyMatchReaction` can't rescue it (distance 3 cap, notes only; real distance ~28)
and `cleanNote` doesn't touch parens. Same exact-match lookup feeds
`MedicationAllergy.severity` at `AllergyAssociationService.java:199`, so the degraded
severity reaches medication-allergy alerting. Related but distinct:
OR-2837 (unmapped reactions in prod, closed working-as-designed).

Ties to [[reference-qa-suite-rule-details-api]] and [[project-mayo-fhir-ticket-validation]].
