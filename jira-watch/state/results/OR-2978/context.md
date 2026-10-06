# OR-2978 — Bug/investigation: a-wrong-antibiotic fires despite of sulfa allergy

Status: Testing   Assignee: Ryan Ducharme

## Description

*Scenario:*

In Product-> Mayo-PHI files [INTERNAL] → Sprint 93: lives a document called wrong-antibiotic_sulfa_allergy_firings. Contains case ID, firing ID, etc. for a-known-procedure-wrong-antibiotic firings, where Sulfamethoxazole was expected, Cefazolin was administered, and patient had a Sulfamethoxazole allergy.

*Expectation:* should not have fired because patient had a sulfa allergy.

*Claude’s theory:* The allergy isn't coded. There's no "sulfa" entry in Mayo's allergy-mapping.csv or its allergen list. The allergy is recognized only if the EHR sends an RxNorm or SNOMED code that's in the SULFONAMIDE cross-reaction group (sulfamethoxazole 10180, SNOMED 387406002 "Sulfonamide", and others). A free-text "SULFA" allergy with no code wouldn't be recognized, so sulfa would stay the recommended drug and cefazolin would trigger the alert.



If rule should not have fired, we should mark the firings in the document as compliant.

## Comments (0)

(none)
