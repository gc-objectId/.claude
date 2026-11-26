# OR-3176 — Warn when a once-daily antiemetic is repeated within 24 hours

Status: Testing   Assignee: Ryan Ducharme

## Description

h2. Rule: Do not repeat a once-daily antiemetic within 24 hours

*Rule Identifier:* {{w-antiemetic-early-redose}}
*Type:* WARNING
*Trigger / Base class / Context:* {{SELECTION}} / {{MedicationSelectionRule}} / {{MedicationSelectionContext}}
*Guidance Category:* {{WRONG_DOSE}}
*Rule category:* {{COMPLIANCE_MEDICATION_NOT_ADMINISTERED}}

h3. Behavior

Implement {{spec/rules/w-antiemetic-early-redose.md}}, included below and not yet merged. Don't restate its logic; where this ticket and the spec disagree, the spec is right.

{{SuccinylcholinePriorMedicationAdministrationWarningRule}} ({{w-sux-prior-meds}}) is the closest existing shape: a selection-time warning that looks back over prior administrations in a fixed window.

h3. Compliance

Reuse {{MedicationNotAdministeredComplianceEvaluator}}, wired the way {{QTcProlongingMedicationWarningRule}} does it. No new evaluator.

* Add {{categories = RuleCategory.COMPLIANCE_MEDICATION_NOT_ADMINISTERED}} to the {{@RuleDefinition}}.
* Put the selected medication's primary category in the details under {{AbstractMedicationAdministeredComplianceEvaluator.TARGET_MEDICATION_CATEGORY_KEY}} ({{APREPITANT}}, {{GRANISETRON}} or {{PALONOSETRON}}).
* Scored at case stop: non-compliant when a medication in that category is administered between the firing and operation end. Because it matches by category, a granisetron transdermal patch ({{GRANISETRON}}) counts. That is intended.

h3. Clinical data needed

* The medication being selected
* Prior administrations in the last 24 hours (bolus), with medication identifier and administration time

Drugs, matched by identifier on both the selection and the prior dose:

||Drug||Identifiers that count as the same drug||
|Aprepitant|{{m-aprepitant}}|
|Granisetron|{{m-granisetron}} (IV), {{m-granisetron-tablet}}|
|Palonosetron|{{m-palonosetron}}|

{{m-granisetron-transdermal}} is excluded both as a selection and as a prior dose. It does count for compliance (see above).

h3. Prompt tokens

||Field||Value||
|Warning text|{{Patient received ${PRIOR_MEDICATION_NAME} at ${PRIOR_ADMIN_TIME}. ${PRIOR_MEDICATION_NAME} is dosed once every 24 hours.}}|
|Accept / Reject|None (warning)|
|Rejection reasons|None|
|Allow suppression|No|

{{${PRIOR_MEDICATION_NAME}}} / {{${PRIOR_ADMIN_TIME}}} are the most recent qualifying dose.

h3. Timing

* Window: 24 hours back from the selection time, pre-op doses included. Not configurable per site.

h3. Acceptance criteria

* [ ] Every bullet under _Fires when_ has a test that fires (one per drug, plus IV granisetron after a tablet and the reverse)
* [ ] Every group under _Abstains when_ has a test that abstains (other drug, transdermal patch, dose > 24 h ago, a different one of the three drugs given)
* [ ] Each _Cannot evaluate_ case behaves as the spec says, and is not an exception
* [ ] The prompt renders the exact wording in the spec and names the most recent dose
* [ ] Citations render (once a reference is supplied)
* [ ] Compliance: a firing followed by a dose of the same drug before case end is non-compliant; with no such dose it is compliant; a granisetron patch after a granisetron warning is non-compliant
* [ ] {{covers:}} and {{context:}} are filled with the real paths
* [ ] The spec merges in this PR, with this ticket's key in its History line

h3. Open

* Clinical reference for the 24-hour interval. The spec reads "Needs a clinical reference."
* What happens to a recorded dose with no administration time. The spec reads {{<to be confirmed>}}.

h3. Spec (proposal)

{noformat}---
rule: w-antiemetic-early-redose
covers: [<to be filled by the implementer>]
context: [<to be filled by the implementer>]
clinical: true
variants: []
reviewed: false
regenerated: 2026-11-09
---

# Do not repeat a once-daily antiemetic within 24 hours

## Clinical overview

**Aprepitant, granisetron and palonosetron are not given again within 24 hours of a prior
dose of the same drug.**

These three antiemetics are dosed once every 24 hours, so a second dose inside that window
adds exposure without adding protection against nausea. The warning appears when one of them
is selected and the same drug was already given in the last 24 hours. It names the earlier
dose and when it was given, and states the interval. It is shown beside the medication and
asks for no response.

Granisetron given intravenously and granisetron given as a tablet are the same drug here: a
dose of either form counts against a selection of either form.

## Fires when

Aprepitant, intravenous or oral granisetron, or palonosetron is being selected, and a dose of
the same drug was administered in the last 24 hours.

## Abstains when

**Out of scope**

- The medication being selected is not aprepitant, intravenous or oral granisetron, or
  palonosetron.
- The medication being selected is the granisetron transdermal patch.

**Requirement already met**

- No dose of the same drug was administered in the last 24 hours. A prior dose of one of the
  other two drugs does not count.

**Cannot evaluate**

- A dose taken at home or given before the patient arrived was never recorded here, so it is
  not seen. The selection reads exactly like a first dose.
- A recorded dose with no administration time: <to be confirmed>.

## Prompt

Warning text, with no action to accept or reject:

> Patient received {medication given} at {time given}. {medication given} is dosed once every 24 hours.

Where more than one earlier dose falls in the window, the most recent is named.

## Citations

- Needs a clinical reference.

## Lockout and compliance

No lockout. The warning is shown each time one of these drugs is selected while an earlier
dose of the same drug is inside the window.

Compliance is judged when the case ends. A warning is met unless the same drug is given after
it, up to the end of the case. Granisetron given in any form counts, including a transdermal
patch. A warning raised after the case has ended is not judged. The guidance is categorized as
a wrong dose.

## Known gaps

- Only doses recorded here count. Aprepitant is often taken by mouth before arrival, and that
  dose raises nothing.
- A granisetron transdermal patch already in place does not count against a selection of
  intravenous or oral granisetron, although the patient is receiving the drug.
- Only the same drug counts. Granisetron and palonosetron work the same way, so giving one
  within 24 hours of the other raises nothing.
- Fosaprepitant, the intravenous form of aprepitant, is not on the site's medication list and
  is not covered.
- Compliance does not check the 24 hours. A dose given later in the same case, after the 24
  hours have passed, still counts the warning as not met.
- Each warning is judged on its own. One repeat dose marks every earlier warning for that drug
  in the case as not met.

## History

- 2026-11-09 · OR-3176 · Warn when aprepitant, granisetron or palonosetron is selected
  within 24 hours of a prior dose of the same drug.{noformat}

## Comments (4)

### Theodore Nguyen-Cao — 2026-11-10T20:53:35

use primary category instead of m- 

### Alexandra Wolfe — 2026-11-10T21:57:37

[~accountid:62b9bc60228c59d8da18dead] Done. Working on citation.

### Theodore Nguyen-Cao — 2026-11-18T17:45:39

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] Do we have the citation? 

### Alexandra Wolfe — 2026-11-18T21:35:41

[~accountid:62b9bc60228c59d8da18dead] pr created

