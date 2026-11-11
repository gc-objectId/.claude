# OR-3097 — w-indication-dose-options: preselect the Procedural indication for IV heparin

Status: Testing   Assignee: Ryan Ducharme

## Description

Rule: {{w-indication-dose-options}} (SELECTION / MedicationSelectionRule / MedicationSelectionContext). It shows no text; it shapes the dosing form.

h4. Problem

When a clinician opens IV heparin, no indication is selected. The dose list mixes Procedural, CPB, and ECMO amounts (25 to 400 units/kg). Most intraoperative IV heparin is procedural, so the clinician must click Procedural every time, and a clinician who does not click it chooses from a list that includes CPB doses.

h4. Current behavior

The dosing form opens with no indication selected and shows every amount for the route. Changing the route clears the indication. The site's indication table has no way to mark a default indication. Mayo and MGB both configure Prophylaxis (SC), Procedural, CPB, and ECMO (IV) for m-heparin and m-heparin-pf.

h4. Spec delta

Implement this in spec/rules/w-indication-dose-options.md. Where this ticket and the spec disagree, the spec is right.

{noformat}## Clinical overview
+ The site can mark one indication per route as the default. When the clinician
+ opens the dosing form on that route, the default indication is already
+ selected and only its amounts are shown. The clinician can select another
+ indication, or clear it to see every amount.
## Fires when
(unchanged)
## History
+ <date> · OR-3097 · A site can preselect an indication per route, because IV
+ heparin is almost always procedural and the full list mixes in bypass doses.{noformat}

h4. Configuration

* A default marker per indication row in the site's indication dosing table. No marker: no indication is preselected (today's behavior).
* Procedural is the default for IV m-heparin and m-heparin-pf at the sites confirmed below.

h4. Worked example

83 kg adult (the attached MGH TST screenshot). Clinician selects heparin, route Intravenous.

* Now: no indication selected; the list shows every IV amount, including CPB.
* After: Procedural is selected; the list shows 2,100 / 4,200 / 5,000 / 6,600 units (25 / 50 / 60 / 80 units/kg). No dose is preselected.

h4. Open questions

* Sites: all
* Subcutaneous has only Prophylaxis. Preselect it too.
* Does a preselected indication change how the given dose is judged for compliance, compared with a clinician who picks it? - Answer: No.

h4. Acceptance criteria

* IV heparin opens with Procedural selected at the configured sites
* Changing the route, then returning to IV, selects Procedural again
* Clicking Procedural clears it and shows every amount
* A medication with no default marker behaves as today
* The spec delta merges in the same PR as the code

!IMG_1573 (0f11ae2c-bf90-4805-86dc-3b5106016114).jpg|width=571,alt="IMG_1573.jpg"!

## Comments (2)

### Theodore Nguyen-Cao — 2026-10-22T16:06:59

h3. Proposed rule change (not approved)

Suggested title: w-indication-dose-options: preselect the Procedural indication for IV heparin

Rule: {{w-indication-dose-options}} (SELECTION / MedicationSelectionRule / MedicationSelectionContext). It shows no text; it shapes the dosing form.

h4. Problem

When a clinician opens IV heparin, no indication is selected. The dose list mixes Procedural, CPB, and ECMO amounts (25 to 400 units/kg). Most intraoperative IV heparin is procedural, so the clinician must click Procedural every time, and a clinician who does not click it chooses from a list that includes CPB doses.

h4. Current behavior

The dosing form opens with no indication selected and shows every amount for the route. Changing the route clears the indication. The site's indication table has no way to mark a default indication. Mayo and MGB both configure Prophylaxis (SC), Procedural, CPB, and ECMO (IV) for m-heparin and m-heparin-pf.

h4. Spec delta

Implement this in spec/rules/w-indication-dose-options.md. Where this ticket and the spec disagree, the spec is right.

{noformat}## Clinical overview
+ The site can mark one indication per route as the default. When the clinician
+ opens the dosing form on that route, the default indication is already
+ selected and only its amounts are shown. The clinician can select another
+ indication, or clear it to see every amount.
## Fires when
(unchanged)
## History
+ <date> · OR-3097 · A site can preselect an indication per route, because IV
+ heparin is almost always procedural and the full list mixes in bypass doses.{noformat}

h4. Configuration

* A default marker per indication row in the site's indication dosing table. No marker: no indication is preselected (today's behavior).
* Procedural is the default for IV m-heparin and m-heparin-pf at the sites confirmed below.

h4. Worked example

83 kg adult (the attached MGH TST screenshot). Clinician selects heparin, route Intravenous.

* Now: no indication selected; the list shows every IV amount, including CPB.
* After: Procedural is selected; the list shows 2,100 / 4,200 / 5,000 / 6,600 units (25 / 50 / 60 / 80 units/kg). No dose is preselected.

h4. Open questions

* Sites: Mayo, MGB, or both? (Alex)
* Subcutaneous has only Prophylaxis. Preselect it too, or IV only?
* Does a preselected indication change how the given dose is judged for compliance, compared with a clinician who picks it?

h4. Acceptance criteria

* IV heparin opens with Procedural selected at the configured sites
* Changing the route, then returning to IV, selects Procedural again
* Clicking Procedural clears it and shows every amount
* A medication with no default marker behaves as today
* The spec delta merges in the same PR as the code

### Theodore Nguyen-Cao — 2026-11-02T16:33:38

One thing to be aware of is if we set a default indication that means all iv heparin will be judged based on that default dose without the user selecting the indication (because it’s autoselected)

