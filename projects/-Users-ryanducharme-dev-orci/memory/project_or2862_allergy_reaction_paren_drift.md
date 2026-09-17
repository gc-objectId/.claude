---
name: project-or2862-allergy-reaction-paren-drift
description: "OR-2862 — CLOSED 2026-09-17: Theo's verbatim CSV seed #4534 validated deploy-ready, tests PR #4560 merged, worktree gone; unmatched reactions still skip silently, follow-up not filed"
metadata: 
  node_type: memory
  type: project
  originSessionId: 70fd9e89-c960-4ed9-919e-b32e8a3eb0c0
  modified: 2026-09-14T19:12:33.487Z
---

OR-2862 (Bug). Theo's PR #4534 seeded the 33 reaction strings Mayo prod actually sends
(mostly legacy `(RESELECT REACTION)` forms) plus two severity reclassifications
(HEPARIN-INDUCED THROMBOCYTOPENIA → TYPE_I, UNKNOWN → TYPE_I). Validated deploy-ready and
moved to Done on 2026-09-14. Tests PR #4560 (`AllergyReactionImporterTest` additions) merged
2026-09-15; worktree and branch removed 2026-09-17. ClaudeBot review lesson: a same-transaction
`@DataJpaTest` read-back returns the identity-map instance — flush + `entityManager.clear()` first.

Our earlier PR #4506 (`AllergyReactionResolver`, strip trailing parenthetical and retry) was
closed unmerged 2026-09-10: the motivating string `HIVES (RAISED, ITCHY, SKIN WELTS)` exists
only in Mayo *staging* Epic, never prod, and a blanket strip is unsafe
(`RASH WITH MUCOSAL LESIONS (SJS, TENS)`).

**Validation shape that worked:** `AllergyReactionImporter` upserts by reaction name and the
catalog entry is `.upserts()`, so a changed CSV checksum re-imports and rewrites existing rows
in place — a local DB that still holds the pre-fix 61 rows gives a real before/after on boot
(94 rows after). Admin `POST /api/admin/patients/{pmrn}/allergies?type=ALLERGEN&identifier=a-penicillin&reaction=...`
with `X-Tenant-Id: mayo-mayo` returns the resolved severity directly; flip-and-revert = insert
the unseeded string into `allergy_reactions` via psql, re-POST, delete. `mvn -o spring-boot:run`
fails locally on the medication-audio-generator plugin's Polly deps — run it online.

**How to apply:** before coding a matching heuristic for EMR text drift, check what prod
actually sends (stage/prod `allergy_reactions` text) rather than the dev/staging FHIR patient.
The real durable gap is visibility: `GetAllergiesR4Command` skips an unmatched reaction with
no log line (`if (allergyReaction == null) return;`), while `AllergyAssociationService` does
warn on the same miss. A follow-up ticket for a warn/Sentry breadcrumb on unmatched reaction
text was proposed, not yet filed. Dev will still resolve that gentamicin allergy as
OTHER_UNKNOWN — expected, not a bug.

Ties to [[reference-qa-suite-rule-details-api]], [[project-mayo-fhir-ticket-validation]],
[[reference_run_worktree_app_second_port]], [[reference_local_hl7_inject_auth]].
