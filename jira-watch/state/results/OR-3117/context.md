# OR-3117 — Dose vancomycin by weight, with a 15–20 mg/kg range when CrCl < 50

Status: Testing   Assignee: Ryan Ducharme

## Description

h2. Rule: Dose vancomycin by weight, with a wider range in reduced renal clearance

*Rule Identifier:* {{w-vancomycin-dose}}
*Type:* WARNING (no text; dose options, preselection and citation only)
*Trigger / Base class / Context:* SELECTION / {{MedicationSelectionRule}} / {{MedicationSelectionContext}}
*Guidance Category:* {{WRONG_DOSE}}

h3. Behavior

Implement {{spec/rules/w-vancomycin-dose.md}}, below and not yet merged. Do not restate its logic; where this ticket and the spec disagree, the spec is right.

In short:

* CrCl > 50 or = 50, or CrCl not calculable (including dialysis with no CrCl): preselect 15 mg/kg *actual* body weight.
* CrCl < 50: offer only 15 mg/kg and 20 mg/kg actual body weight, no preselection; a dose from 15 to 20 mg/kg inclusive, ± one rounding step (0.25 g), is compliant.

*Site enablement:* Mayo only. Not enabled for MGB or demo.

*Behavior change for every Mayo vancomycin patient:* 15 mg/kg moves from ideal to actual body weight in every band, not only CrCl < 50.

h3. Mayo configuration to change

This rule owns vancomycin IV dosing at Mayo, so the generic rules must stop speaking for it, or they will preselect 15 mg/kg (ideal weight) over this rule's "no preselection":

* {{data/org/mayo/medications/DoseAdjustments.xlsx}} → *Normal* sheet: remove the {{m-vancomycin-iv}} default-dose row (15 mg/kg, Ideal). Otherwise {{w-default-dose-adjustment}} still preselects it.
* Same workbook → *Underweight* sheet: the {{m-vancomycin-iv}} row (15 mg/kg) makes {{w-dose-option-adjustment}} replace the dose list for underweight patients. Remove it or reconcile it with this rule.
* Same workbook → *Classifications*: {{m-vancomycin-iv}} row. Confirm {{w-weight-type-adjustment}} no longer reports ideal weight for vancomycin.
* {{data/org/mayo/medications/dosing/medication-dosing.csv}} → {{m-vancomycin-iv}} dose options ({{1 g, 1.5 g, 2 g, 15 mg/kg}}, rounding 0.25 g): add 20 mg/kg as needed.

h3. Historical compliance correction

Past Mayo vancomycin IV firings were scored by {{w-default-dose-adjustment}} against the single 15 mg/kg preselection, so a dose between 15 and 20 mg/kg given to a patient with CrCl < 50 was recorded as not compliant. Re-score those firings as compliant.

* Scope: Mayo, {{w-default-dose-adjustment}} firings for {{m-vancomycin-iv}} currently scored not compliant, where the patient's CrCl at the time of the firing was < 50 and the dose given was 15–20 mg/kg inclusive, ± one rounding step (0.25 g).
* Firings with CrCl ≥ 50 or no calculable CrCl are left as they are.
* Open: which weight to use for mg/kg (actual, as the new rule does, or ideal, as the firing used at the time).
* Open: date range (all Mayo history, or from a start date).
* Open: how CrCl at the time of firing is reconstructed (the CrCl recorded with the firing, or recalculated from the latest creatinine before it).
* Report how many firings change before applying, and keep the run repeatable.

h3. Clinical data needed

* Calculated creatinine clearance (same source as {{w-vancomycin-renal-disease}}).
* Actual body weight.

h3. Prompt tokens

||Field||Value||
|Title / Description|None. Citation only|
|Accept / Reject|None|
|Rejection reasons|None|
|Allow suppression|No|

h3. Open values (need a clinician / product)

* Clinical rationale for a higher ceiling (20 mg/kg) in reduced clearance. The spec's overview is marked as needing it.
* Citations for 15 mg/kg actual weight and for the 15–20 mg/kg range when CrCl < 50.
* Existing Mayo vancomycin citations ({{r-vancomycin-iv-default-dose}}, {{-underweight-dose}}, {{-overweight-dose}}, {{r-vancomycin-renal-disease}}) link to an MGB document ({{mgb.ellucid.com}}). Confirm or replace.
* Behavior with no recorded weight.
* Paediatric patients: in or out of scope.
* No lockout assumed. Confirm.

h3. Acceptance criteria

* [ ] Every bullet under _Fires when_ has a test that fires
* [ ] Every group under _Abstains when_ has a test that abstains
* [ ] Each _Cannot evaluate_ case behaves as the spec says, and is not an exception
* [ ] The prompt renders the exact wording in the spec
* [ ] Citations render
* [ ] Mayo config no longer lets {{w-default-dose-adjustment}} or {{w-dose-option-adjustment}} override this rule for vancomycin IV
* [ ] Historical Mayo vancomycin firings with CrCl < 50 and a 15–20 mg/kg dose are re-scored compliant, with the count of changed firings reported
* [ ] {{covers:}} and {{context:}} are filled with the real paths
* [ ] The spec merges in this PR

----

h3. Spec proposal: {{spec/rules/w-vancomycin-dose.md}}

{noformat}---
rule: w-vancomycin-dose
covers: [<to be filled by the implementer>]
context: [<to be filled by the implementer>]
clinical: true
variants: []
reviewed: false
regenerated: 2026-10-26
---

# Dose vancomycin by weight, with a wider range in reduced renal clearance

## Clinical overview

**Vancomycin IV is dosed at 15 mg/kg of actual body weight, and a patient with a creatinine
clearance below 50 mL/min may receive anywhere from 15 to 20 mg/kg.**

Needs a clinician: the reason reduced clearance widens the range upward, rather than leaving
the dose alone, has not been given. Renal function more usually changes the interval than the
size of a dose, so the motivation should be stated here before this is reviewed.

The rule acts whenever vancomycin IV is chosen, before any dose is given, and what it does
depends on the patient's calculated creatinine clearance:

- 50 mL/min or above, or no clearance can be calculated, preselect 15 mg/kg.
- Below 50 mL/min, offer 15 mg/kg and 20 mg/kg, and preselect neither.

Both doses are calculated on the patient's actual body weight, and both are rounded to the
site's rounding step for vancomycin. The default step is 0.25 g.

## Fires when

Vancomycin IV is the medication being selected. The rule always acts, and what it does
depends on the patient's calculated creatinine clearance.

## Abstains when

**Out of scope**

- The medication being selected is not vancomycin IV. Oral vancomycin is not spoken to.
- The patient is a child: <to be confirmed>.

**Cannot evaluate**

- No creatinine clearance can be calculated. The patient is not passed over: they are given
  the 15 mg/kg preselection, as though their renal function were normal.
- A patient recorded as on dialysis with no calculable clearance is treated the same way.
  Dialysis alone does not move a patient into the wider range.
- The patient has no recorded weight, so no weight-based dose can be worked out. What the
  clinician sees then is <to be confirmed>.

## Prompt

No text is shown. The rule contributes the dose amounts on the form, the preselection where
there is one, and the reference beside the dose choices. There is nothing to accept or
reject.

## Citations

- Needs a clinical reference for 15 mg/kg of actual body weight.
- Needs a clinical reference for the 15 to 20 mg/kg range below a creatinine clearance of
  50 mL/min.

## Lockout and compliance

No lockout is assumed, <to be confirmed>: the doses are recalculated and offered on every
selection of vancomycin IV.

Compliance is judged on the dose actually given. At a clearance of 50 mL/min or above, or
where none can be calculated, it counts as met when the dose matches the 15 mg/kg
preselection to within one rounding step either side. Below 50 mL/min it counts as met when
the dose falls between 15 and 20 mg/kg inclusive, with one rounding step allowed either
side. The guidance is categorized as a wrong dose.

## Known gaps

- **A patient whose clearance cannot be calculated is dosed as though their kidneys were
  normal.** Clearance needs creatinine, age, sex and weight together, and any one missing
  gives the 15 mg/kg preselection with no sign that the wider range was considered.
- Below 50 mL/min the clinician sees two doses and no preselection, with only the reference
  to explain why. A clinician who does not open it is not told that the choice is theirs.
- The rule speaks to the size of a dose, not the interval. A further dose in reduced
  clearance is left to the separate pharmacy-consult warning.
- Dialysis without a calculable clearance keeps the standard preselection, so a dialysis
  patient is not offered the range this rule gives a patient with low clearance.

## History

- 2026-10-26 · OR-3117 · Dose vancomycin IV on actual weight and allow 15 to 20 mg/kg below a clearance of 50 mL/min.{noformat}

## Comments (0)

(none)
