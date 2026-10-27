# OR-2982 — Ideal body weight calculation

Status: Testing   Assignee: Ryan Ducharme

## Description

Calculator.calculateIdealBodyWeight uses base + 2.3 × (60 − height) for patients under 60 in. The result goes up as height goes down. OR-559 and OR-560 define IBW as base + 2.3 × (height − 60) for all heights, and the Javadoc agrees. Every version of the code since 2022-09 has this error.

Example: a 56 in woman gets 54.7 kg (the IBW of a 64 in woman). The spec gives 36.3 kg.

Impact: IBW is always calculated (the Epic IBW from OR-395 is not used). Adjusted body weight uses it, and adult Cockcroft-Gault CrCl uses it to choose between actual and adjusted weight (actual ≥ 120% of IBW). For patients under 60 in, this affects IBW-based and adjusted-weight doses and max doses (local anesthetics, procainamide, calculated-weight meds) and CrCl-based renal rules (ketorolac, meperidine, vancomycin). Heights of 60 in or more are correct.

h3. Acceptance criteria

* IBW = 50 (male) or 45.5 (female) + 2.3 × (height_in − 60) for all heights.
* When the formula gives 0 kg or less (below about 38.3 in male, 40.2 in female), IBW is unknown. Rules act as they do with no ideal weight, so no negative CrCl or dose is possible.
* Tests cover heights under 60 in for both sexes, check that IBW never goes up as height goes down, and cover the non-positive cutoff.

h3. Open question for PM

Devine does not define IBW under 60 in. The spec formula gives low values there (4 ft 6 in woman: 31.7 kg). Confirm that no higher floor or clinical minimum height applies above the 0 kg cutoff.

## Comments (0)

(none)
