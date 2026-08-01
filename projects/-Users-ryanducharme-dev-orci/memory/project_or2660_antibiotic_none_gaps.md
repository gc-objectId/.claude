---
name: or2660-antibiotic-none-gaps
description: "OR-2660 (None+CEFAZOLIN tier-0 antibiotic compliance) is NOT test-only — two verified code gaps; validated by code read 2026-07-31, no code written per Ryan"
metadata: 
  node_type: memory
  type: project
  originSessionId: c3dd8ee3-16a1-4077-acc2-91fb44cb7664
  modified: 2026-07-31T19:11:53.858Z
---

OR-2660 "Testing antibiotic recommendations - None/CEFAZOLIN" (Task under epic OR-2434 Mayo Integration, status *Ready for Testing*) claims to be "purely a testing ticket." **It is not** — the behavior it asserts (a procedure listing both `None` and an antibiotic at tier 0 → *both* options compliant) does not hold. Ryan's call 2026-07-31: **report only, no code**; scope decision goes to Theo/Alex.

**Where the data lives.** Mixed config arrives via open PR **#4248** (`mayo-config-fix`, re-landing the 7.29 delivery that `73fc075e9` added and `49aeb7c93` reverted). Its Mayo `antibiotic-candidates.csv` lines 56–58 give the same **14 gyn procedures** `None`@0 / `CEFAZOLIN`@0 / `CIPROFLOXACIN`@1 (hysteroscopy, ovarian cystectomy+torsion lap/robotic, oophorectomy & salpingo-oophorectomy lap/robotic/endoscopic, ectopic pregnancy lap/robotic, gyn ablation). Main's Mayo CSV has one pure-`None` row, **zero** overlap — unreachable on main via Mayo data.

**Already reachable on demo-qa today** (qualifier-split, so intent is unambiguous): `demo/antibiotic-candidates.csv` `p-laparoscopic` = `None`@`elective-low-risk` (line 15) vs `CEFAZOLIN`/`CEFOXITIN`@rank 0 `elective-high-risk` (16–17); same shape for `p-cystourethroscopy`. **This is the repro/e2e target Ryan chose** — no fixture data needed.

**Gap 1 (small) — selecting cefazolin alerts.** `KnownProcedureAntibioticNotRecommendedRule:50-61` fires on only: is-antibiotic, procedure mapped, `existsNoneConfiguredByProcedureTypeIdentifier`. That probe (`ProcedureAntibioticCandidateRepository:31-34`) is a bare "any row with empty `medicationCategories`" check — ignores qualifier + case classification, and never asks whether the selected antibiotic is itself a candidate. Holds with the qualifier feature flag on **or** off. Existing `testFires` (`KnownProcedureAntibioticNotRecommendedRuleTest:80-93`) encodes the too-broad contract. **Recommended fix: abstain when `preferredAntibiotics` is non-empty** — preserves mutual exclusivity with `a-known-procedure-wrong-antibiotic` (asserted by PABX-015) and fixes both the demo qualifier case and Mayo tier-0 case in one change.

**Gap 2 (structural) — giving nothing alerts.** `KnownProcedureNoAntibioticRule:81-85` abstains only when `preferredAntibiotics` is empty, but NONE rows are stripped before the context exists: `isRecommendation` = `!isNone()` filters them in `getCandidates`/`getPreferredCandidates` and the Redis read re-applies it (`ProcedureAntibioticCandidateService:134-136,156,365-368`). Root cause is the importer — `ProcedureAntibioticCandidateCSVImporter:123-129` builds NONE rows with `procedureType` only, **discarding rank, qualifier and case classification** (its own `// todo: should NONE support qualifiers / case-classification?`). So "None at tier 0" and "None @ elective-low-risk" both degrade to an untiered procedure-level boolean. Fix needs those fields persisted + a context-aware NONE lookup + unwinding the DTO's non-null-rank assumption.

**Coverage gap.** `qa-suite/clinical-rules/procedure-antibiotics.spec.ts` (PABX-001..018) deliberately avoids the mixed case: PABX-015 = `p-gastro-uncomplicated` (pure None, no candidates → fires correctly); PABX-016 = `p-gastroduodenal` (candidates, no None row → abstains correctly). Nothing covers both on one procedure.

**Open question for Theo/Alex:** are the Mayo `None`@0 rows intended, or a merged-cell artifact of the source spreadsheet? PR #4248's body is a content-review doc but never flags this pattern. Ticket predates the 7.29 delivery (created 2026-07-15), which suggests Theo saw the pattern independently and stated intent.

Related: [[mayo-integration-testing]], [[feedback_validation_protocol]], [[feedback_validate_against_main]]
