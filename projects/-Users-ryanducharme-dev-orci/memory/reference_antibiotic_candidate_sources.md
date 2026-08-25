---
name: antibiotic-candidate-sources
description: Antibiotic candidates now resolve once into CaseAntibioticProtocol — the old two-context-fields split is gone
metadata: 
  node_type: memory
  type: reference
  originSessionId: 1998602b-3603-4890-be21-fd3cc54c3ad2
  modified: 2026-08-12T13:12:05.707Z
---

**Superseded again as of 2026-08-22** (Theo's antibiotic-pathway rework, PRs #4411 / #4415 / #4430 / #4431). `antibiotic-candidates.csv` is gone in every tenant, replaced by `antibiotic-pathways.csv` with columns `Procedure, Risk, Acuity, Pathway` — a single pathway expression using `->` for fallback tiers and AND/OR within a tier, instead of Candidates + Preference Rank. `Qualifier` became `Risk`, `Case Classification` became `Acuity` (pipe-separated for multiple, e.g. `urgent | emergent`). New tables `antibiotic_pathways` and `antibiotic_pathway_acuities` (tenant changesets 213/214). Mayo is still the only tenant populating Risk or Acuity.

**Superseded as of 2026-08-11** (OR-2597 / OR-2721 / OR-2725, PRs #4229 / #4284; caching in OR-2726 / #4350). The two-candidate-list split described below no longer exists.

**Now:** `ProcedureAntibioticCandidateService.resolve(patient, operation, user)` returns a single `AntibioticResolution` wrapping a `CaseAntibioticProtocol`, with an `Outcome` (`RECOMMENDED`, `NO_PROPHYLAXIS_INDICATED`, `NOT_CONFIGURED`, `ALL_CONTRAINDICATED`). Rules read `context.getAntibioticProtocol()`. Scoping by qualifier and classification happens in `applicableRowsPerProcedure` **before** any rule sees a row, and NONE rows are scoped on the same terms as candidate rows.

**Previously** (still useful for reading pre-Aug-2026 code and tickets): `RuleEngineService` populated two lists — `getPreferredAntibiotics()` from `getPreferredCandidates(...)`, read by the no-antibiotic and wrong-antibiotic rules; and `getAllAntibioticCandidateGroupsForProcedureType()` from `getCandidates(...)`, read by the missing-antibiotic rule.

**Why it still matters:** the hazard the split created outlived the split. A candidate-narrowing rule applied in one place, or applied to the wrong subset of rows, silently changes only some outcomes — that is how OR-2322 shipped broken (an urgent cesarean given only cefazolin was silenced because `findCompletelyGivenGroup` saw the *elective* candidate as fully given) and how both OR-2321 review bugs happened. Scoping must be right before a rule sees a row, because a row this case does not carry still counts as satisfied once its drugs are given.

**How to apply:** verify narrowing at the service layer — `ProcedureAntibioticCandidateServiceTest` and `AntibioticResolutionTest`. Rule-level tests set the context field directly, so they cannot catch a wiring or scoping gap.

Related: [[project_or2321_case_classification]], [[mayo-integration-testing]]
