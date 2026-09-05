---
name: non-pen-ceph-allergy-path
description: "How a non-penicillin/cephalosporin antibiotic allergy reaches the pathway walk (RxNorm only, flag-gated) and why the ANTIBIOTIC med tag matters for pathway drugs"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8a468fe1-b26a-463e-87fc-849522f32917
  modified: 2026-09-04T14:07:59.100Z
---

`master-allergen-list.csv` (identical in demo/mgb/mayo, 80 rows) holds only pen/ceph, narcotics and
ketorolac. Doxycycline, metronidazole, sulfa, clinda, vanco, etc. have **no allergen**, so an EMR
allergy to them has `allergen = null` and the `Allergy → Allergen → associatedMedications` path is dead.

The only thing that turns such an allergy into a `MedicationAllergy` is
`AllergyAssociationService.associateAllergiesViaRxNormMapping` (RxNorm code → `master-rxnorm-list.csv`
→ medication, plus `allergy-cross-reaction-groups.csv` → category), gated per tenant by the
`RXNORM_ALLERGY_MAPPING` flag (seeded off, `enabledTenants: []`). Mayo's FDB fallback is commented
out, so with the flag off these allergies produce nothing and the pathway step stays recommended.
Flag state for mayo-mayo in prod was unconfirmed as of 2026-09-04 (VPN down).

The walk itself (`ProcedureAntibioticCandidateService.evaluateCategory`) is drug-agnostic: only
`MedicationAllergyRule` (`a-general-allergy`) can fire for these drugs, matching by exact medication,
by category (how SULFONAMIDE works), or by allergen.

Separate trap: every "was prophylaxis given" rule (`StartProcedureMissingAntibioticRule`, redose,
wrong-antibiotic) keys on `hasMedicationCategory(ANTIBIOTIC)`. A pathway drug without that tag is
recommended and then never counted as given. Sulfa, linezolid, micafungin and lidocaine-ceftriaxone
all had this gap until OR-2846; `BundledAntibioticPathwayTest` now fails the build on any recurrence.

**How to apply:** when a non-pen/ceph allergy "didn't invalidate the pathway", check the tenant's
flag and whether the incoming RxNorm code is in that tenant's rxnorm list before suspecting the walk.
Spec coverage lives in `AntibioticPathwayResolutionSpecTest` ("What the walk reads off a coded allergy").

Related: [[antibiotic-candidate-sources]], [[project_or2862_allergy_reaction_paren_drift]]
