---
name: or2791-nsaid-group-crosswalk-defect
description: OR-2791 NSAID cross-reaction group validated Done 2026-09-14; exposed pre-existing crosswalk rows mapping ibuprofen/naproxen to non-NSAID meds in demo/mgb, filed as OR-2925 for Jordan
metadata:
  type: project
---

OR-2791 (NSAID allergy cross-reaction group, subtask of OR-2783) closed Done 2026-09-14 from the jira-watch evidence, reviewed by hand. Group mechanism passed positive, negative and data-flip red check. No tests PR was written; the loop's proposed ALG supplemental tests live only in its session.json, not in the automation backlog.

Blocker it surfaced was NOT this ticket's code: demo and mgb `master-rxnorm-list.csv` map RxNorm 5640 (ibuprofen) to g-famotidine, m-famotidine-oral, m-gabapentin, m-omeprazole and 7258 (naproxen) to m-esomeprazole. Mayo is correct because ibuprofen is on its formulary. Likely cause: the crosswalk pipeline (`tools/rxnorm-crosswalk`) climbs each product RXCUI to every ingredient, so a combination-product NDC (ibuprofen/famotidine etc.) mapped to a single-ingredient med leaks the other ingredient's code onto it. The famotidine row dates to 2026-08-11, before OR-2791; PR #4476's generic derivation copied it onto g-famotidine. Filed as OR-2925, assigned to Jordan, with a proposed data test (every group code maps only to meds tagged with the group's category).

**Why:** the RXNORM_ALLERGY_MAPPING flag is off for all tenants (changeset 037), so nothing is live, but OR-2925 must land before it is enabled. The allergen label preferring the mapped med name over the category is by design (MedicationAllergyRuleTest), not a bug.

**Pending coverage, do this when OR-2925 is picked up:** OR-2791's proposed tests were never written or added to the jira-watch coverage backlog. They live only in `~/.claude/jira-watch/state/results/OR-2791/session.json` (automation.proposed_tests). Write them with OR-2925's data test on the OR-2925 branch: ALG supplemental API-only tests for RXNORM 3355 -> m-ketorolac fires a-general-allergy with ALLERGY_ALLERGEN NSAID and m-propofol does not; SNOMED 372665008 -> same; RXNORM 8782 (propofol) -> ketorolac silent, propofol fires with ALLERGY_ALLERGEN Propofol. Add an ibuprofen 5640 case asserting the label reads Ibuprofen (or NSAID where no ibuprofen med exists), which only passes once the rows are fixed.

**How to apply:** when a coded-allergy validation shows a wrong drug name, check the org's master-rxnorm-list.csv join before suspecting the rule. Rerun the group-vs-category join across all three orgs to size it. See [[non-pen-ceph-allergy-path]] and [[jira-watch-autovalidate]].
