---
name: project-or2862-allergy-reaction-paren-drift
description: OR-2862 — closed our resolver PR #4506; real fix was Theo's verbatim CSV seed (#4534); the drift string was dev-only; unmatched reactions still skip silently
metadata:
  type: project
---

OR-2862 (Bug, reassigned to Theo 2026-09-10). Our PR #4506 added `AllergyReactionResolver`
(exact match, then strip a trailing parenthetical and retry). Closed unmerged on 2026-09-10;
worktree torn down. Theo's PR #4534 seeds the 33 reaction strings Mayo prod actually sends
(mostly legacy `(RESELECT REACTION)` forms) plus two severity reclassifications
(HEPARIN-INDUCED THROMBOCYTOPENIA → TYPE_I, UNKNOWN → TYPE_I).

**Why closed:** the motivating string `HIVES (RAISED, ITCHY, SKIN WELTS)` (Wilfredo, PMRN
11292547) exists only in Mayo *staging* Epic, never in prod. Paren-stripping would have
rescued only strings whose base word is seeded; it does nothing for STEVENS-JOHNSON SYNDROME
or `... (SCAR), UNSPECIFIED`, and can under-classify (unseeded `RASH (WITH BLISTERING)` →
MILD). Verbatim seeding is the team's approach; `RASH WITH MUCOSAL LESIONS (SJS, TENS)` shows
why a blanket strip is unsafe.

**How to apply:** before coding a matching heuristic for EMR text drift, check what prod
actually sends (stage/prod `allergy_reactions` text) rather than the dev/staging FHIR patient.
The real durable gap is visibility: `GetAllergiesR4Command` skips an unmatched reaction with
no log line (`if (allergyReaction == null) return;`), and `AllergyAssociationService.java:199`
runs the same exact-match lookup for `MedicationAllergy.severity`. A follow-up ticket for a
warn/Sentry breadcrumb on unmatched reaction text was proposed, not yet filed. Dev will still
resolve that gentamicin allergy as OTHER_UNKNOWN after #4534 merges — expected, not a bug.

Ties to [[reference-qa-suite-rule-details-api]] and [[project-mayo-fhir-ticket-validation]].
