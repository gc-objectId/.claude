---
name: or2660-antibiotic-none-gaps
description: "OR-2660 CLOSED Done, no code — None+antibiotic compliance is two real bugs, split to OR-2728 (rule) + OR-2729 (importer qualifier); Alex settled the semantics"
metadata: 
  node_type: memory
  type: project
  originSessionId: c3dd8ee3-16a1-4077-acc2-91fb44cb7664
  modified: 2026-08-05T20:55:32.960Z
---

OR-2660 "Testing antibiotic recommendations - None/CEFAZOLIN" (Task under epic OR-2434) claimed to be "purely a testing ticket." **It wasn't** — the behavior it asserts (a procedure listing both `None` and an antibiotic → *both* options compliant) does not hold. **CLOSED Done 2026-08-05 with no code written**: investigation complete, gaps split into **OR-2728** (Gap 1) and **OR-2729** (Gap 2), both Bug/To Do under OR-2434 (neither is Mayo-only — Gap 1 reproduces on demo config on main).

**Close-out pattern worth reusing:** a testing ticket whose answer is "this needs a code fix" closes as *scope-complete*, not as a passing validation. The comment says so explicitly ("not a deploy-ready verdict") so nobody reads the green status as validated behavior. Sequence: file the follow-up tickets first → update the comment to link them → then transition to Done.

**Alex's ruling 2026-08-05 (authoritative on semantics):** "None means no antibiotics requires. 0 is first priority, 1 is second priority." So `None` = blanket *no antibiotic required* for the procedure; the rank column only orders the antibiotics for when one **is** given. **Consequence: the importer discarding rank on NONE rows is CORRECT** — I first mis-flagged that as Gap 2's root cause. The real blocker is the dropped **qualifier** (see Gap 2 below).

**Where the data lives.** Mixed config arrives via open PR **#4248** (`mayo-config-fix`, re-landing the 7.29 delivery that `73fc075e9` added and `49aeb7c93` reverted). Its Mayo `antibiotic-candidates.csv` lines 56–58 give the same **14 gyn procedures** `None`@0 / `CEFAZOLIN`@0 / `CIPROFLOXACIN`@1 (hysteroscopy, ovarian cystectomy+torsion lap/robotic, oophorectomy & salpingo-oophorectomy lap/robotic/endoscopic, ectopic pregnancy lap/robotic, gyn ablation). Main's Mayo CSV has one pure-`None` row, **zero** overlap — unreachable on main via Mayo data.

**Already reachable on demo-qa today** (qualifier-split, so intent is unambiguous): `demo/antibiotic-candidates.csv` `p-laparoscopic` = `None`@`elective-low-risk` (line 15) vs `CEFAZOLIN`/`CEFOXITIN`@rank 0 `elective-high-risk` (16–17); same shape for `p-cystourethroscopy`. **This is the repro/e2e target Ryan chose** — no fixture data needed.

**Gap 1 → OR-2728 (small) — selecting cefazolin alerts.** `KnownProcedureAntibioticNotRecommendedRule:50-61` fires on only: is-antibiotic, procedure mapped, `existsNoneConfiguredByProcedureTypeIdentifier`. That probe (`ProcedureAntibioticCandidateRepository:31-34`) is a bare "any row with empty `medicationCategories`" check — ignores qualifier + case classification, and never asks whether the selected antibiotic is itself a candidate. Holds with the qualifier feature flag on **or** off. Existing `testFires` (`KnownProcedureAntibioticNotRecommendedRuleTest:80-93`) encodes the too-broad contract. **Recommended fix: abstain when `preferredAntibiotics` is non-empty** — preserves mutual exclusivity with `a-known-procedure-wrong-antibiotic` (asserted by PABX-015) and fixes both the demo qualifier case and Mayo tier-0 case in one change.

**Gap 2 → OR-2729 — giving nothing alerts.** `KnownProcedureNoAntibioticRule:81-85` abstains only when `preferredAntibiotics` is empty, but NONE rows are stripped before the context exists: `isRecommendation` = `!isNone()` filters them in `getCandidates`/`getPreferredCandidates` and the Redis read re-applies it (`ProcedureAntibioticCandidateService:134-136,156,365-368`). Root cause is the importer — `ProcedureAntibioticCandidateCSVImporter:123-129` builds NONE rows with `procedureType` only, **discarding qualifier and case classification** (its own `// todo: should NONE support qualifiers / case-classification?`). Rank is *not* part of the fix per Alex's ruling above.

**Why Gap 2 can't be fixed with a bare existence check** (the trap): abstaining whenever *any* NONE row exists for the procedure type would silence a legitimate alert — demo `p-laparoscopic` has `None`@`elective-low-risk` vs candidates @`elective-high-risk`, so a high-risk case with no antibiotic given must still fire. Hence the qualifier must be persisted and the lookup made context-aware. Mayo's NONE rows are unqualified, so a procedure-level check would happen to work there but regress demo/MGB.

**Coverage gap.** `qa-suite/clinical-rules/procedure-antibiotics.spec.ts` (PABX-001..018) deliberately avoids the mixed case: PABX-015 = `p-gastro-uncomplicated` (pure None, no candidates → fires correctly); PABX-016 = `p-gastroduodenal` (candidates, no None row → abstains correctly). Nothing covers both on one procedure.

**Still-open question (carried into OR-2729):** Mayo's NONE rows are unqualified — confirm with Alex that "no antibiotic required" really applies to *every* case of those 14 gyn procedures, rather than a risk-level split that never made it into the spreadsheet. (The "are these rows even intended?" question is settled — yes, per Alex above.)

Related: [[mayo-integration-testing]], [[feedback_validation_protocol]], [[feedback_validate_against_main]]
