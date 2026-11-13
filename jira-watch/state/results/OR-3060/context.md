# OR-3060 — w-insulin-default-dose: choose the subcutaneous insulin scale from the patient's conditions, per site

Status: Testing   Assignee: Ryan Ducharme

## Description

*Rule:* {{w-insulin-default-dose}} (WARNING; SELECTION / MedicationSelectionRule / MedicationSelectionContext)

*Related:* OR-3057 (analytics, type 2 only; migration #4729 merged)

*Problem*

The subcutaneous scale is chosen by age, kidney function, and daily insulin at every site. Mayo chooses it by condition, so Mayo patients get the wrong scale's default dose.

*Now (all sites)*

Moderate: all four of type 2 diabetes, age < 70, latest eGFR ≥ 45, and total daily insulin ≥ 40 units. Low/mild: everyone else. These criteria are fixed in code.

*After*

The criteria become a site setting. Sites that don't choose condition-based criteria keep today's behavior.

At a condition-based site (Mayo):

* Low/mild: type 1 diabetes, prior pancreatectomy, dialysis, or low body weight ("thin," definition to be confirmed).
* Moderate: type 2 diabetes, (out of scope: oral corticosteroid use, tube feeds, or parenteral nutrition)
* A patient who matches any moderate condition gets the moderate scale, even with a low/mild condition too.
* A patient who matches neither list gets the low/mild scale.
* Age, eGFR, and insulin dose are not evaluated.

*Spec change*

Implement this in {{spec/rules/w-insulin-default-dose.md}}. Where this ticket and the spec disagree, the spec is right.

{noformat}## Clinical overview
~ The site chooses how a patient's subcutaneous scale is picked: by age, kidney
~ function and daily insulin (the default, unchanged), or by condition.
+ By condition, the low/mild scale applies to a patient with any of: type 1
+ diabetes, a prior pancreatectomy, dialysis, or low body weight
+ (<to be confirmed: definition>).
+ By condition, the moderate scale applies to a patient with any of: type 2
+ diabetes, oral corticosteroid use, tube feeds, or parenteral nutrition.
+ By condition, a patient with none of these gets the low/mild scale.
+ A patient who matches any moderate condition gets the moderate scale, even
+ when they also match a low/mild condition.
## Abstains when -> Cannot evaluate
+ <per input: which scale applies when the fact is not available>
## History
+ <date> · OR-3060 · A site can pick the subcutaneous scale by condition, because
+ Mayo does not use age, kidney function, or daily insulin to pick it.{noformat}

*Clinical data needed*

||Input||Available today?||
|Type 1 / type 2 diabetes|Yes (conditions)|
|Prior pancreatectomy|To check|
|Dialysis|To check|
|Low body weight ("thin")|Weight yes; definition needed|
|Oral corticosteroid use|No: needs a corticosteroid medication set (same gap as OR-2940)|
|Tube feeds|To check|
|Parenteral nutrition|To check|

*Compliance backfill: re-run changeset 236*

OR-3057 (#4729, changeset {{236-backfill-mayo-insulin-type2-moderate-dose-compliance}}) rescored Mayo {{w-insulin-default-dose}} firings for type 2 patients against the moderate scale. Liquibase ran it once, before the rule changed. Firings since then are scored against the old criteria again, and this will continue until this ticket deploys.

* Changeset 236 selects by rule (type 2 condition, glucose band, dose given), not by hand-picked ids, so a copy with a new changeset id works. Add it in this PR, Mayo only, in the same deploy as the rule change.
* Type 2 gets moderate under both 236 and this ticket (moderate wins), so the copy is correct as is for type 2.
* The other moderate conditions (oral corticosteroids, tube feeds, parenteral nutrition) can't be backfilled until we know we receive them. Extend the copy only for inputs confirmed in the table above.

*Open questions*

* Definition of "thin" (BMI or weight threshold).
* For each input in the table: do we receive it, per site? If not, which scale applies when it is missing?

*Acceptance criteria*

* One test per condition in each list, and one per overlap example (type 2 + dialysis, type 1 + oral corticosteroids, type 2 + thin, type 2 + prior pancreatectomy), each getting the moderate scale.
* A patient with none of the conditions gets the low/mild scale at a condition-based site.
* One test per missing input, matching the spec's Cannot evaluate.
* Sites without condition-based criteria behave exactly as today.
* The spec delta merges in the same PR as the code.
* After deploy, no Mayo type 2 firing is scored against the low/mild scale.

## Comments (3)

### Jordan Ephron — 2026-10-20T19:05:46

the criteria here are now out of sync with [https://guidedclinical.atlassian.net/browse/OR-3057|https://guidedclinical.atlassian.net/browse/OR-3057|smart-link]

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] to double check this ticket

### Alexandra Wolfe — 2026-10-20T19:25:42

[~accountid:640bbd89896d10ebd4754d07] Do you mean because of these additional criterion for type 2: “ oral corticosteroid use, tube feeds, or parenteral nutrition.”?

If so, then that’s expected - we need to look into whether we can get/use those. 

So we are basically fixing analytics based on what criteria we can confidently meet now, and will tackle the rest in the rule update ticket.

### Theodore Nguyen-Cao — 2026-10-22T16:02:44

h3. Proposed rule change (not approved)

Suggested title: w-insulin-default-dose: choose the subcutaneous insulin scale from the patient's conditions, per site

Rule: {{w-insulin-default-dose}} (WARNING; SELECTION / MedicationSelectionRule / MedicationSelectionContext). Related: OR-3057 (analytics, type 2 only; migration #4729 merged).

h4. Problem

The subcutaneous scale is chosen by age, kidney function, and daily insulin, for every site. Mayo chooses it by condition. Mayo patients get the wrong scale's default dose.

h4. Decided

* Per site. The criteria are a site setting. Sites that do not choose condition-based criteria keep today's behavior (type 2, age < 70, eGFR >= 45, daily insulin >= 40 units -> moderate; everyone else -> low). Today these criteria are fixed in code for every site.
* Condition-based: a patient who matches neither list gets the mild scale.
* Condition-based: a patient who matches any moderate condition gets the moderate scale, even with a mild condition too.

h4. Spec delta

Implement this in spec/rules/w-insulin-default-dose.md. Where this ticket and the spec disagree, the spec is right.

{noformat}## Clinical overview
~ The site chooses how a patient's subcutaneous scale is picked: by age, kidney
~ function and daily insulin (the default, unchanged), or by condition.
+ By condition, the mild scale applies to a patient with any of: type 1
+ diabetes, a prior pancreatectomy, dialysis, or low body weight
+ (<to be confirmed: definition>).
+ By condition, the moderate scale applies to a patient with any of: type 2
+ diabetes, oral corticosteroid use, tube feeds, or parenteral nutrition.
+ By condition, a patient with none of these gets the mild scale.
+ A patient who matches any moderate condition gets the moderate scale, even
+ when they also match a mild condition.
## Abstains when -> Cannot evaluate
+ <per input: which scale applies when the fact is not available>
## History
+ <date> · OR-3060 · A site can pick the subcutaneous scale by condition, because
+ Mayo does not use age, kidney function, or daily insulin to pick it.{noformat}

h4. Clinical data needed

||Input||Available today?||
|Type 1 / type 2 diabetes|Yes (conditions)|
|Prior pancreatectomy|To check|
|Dialysis|To check|
|Low body weight ("thin")|Weight yes; definition needed|
|Oral corticosteroid use|No: needs a corticosteroid medication set (same gap as OR-2940)|
|Tube feeds|To check|
|Parenteral nutrition|To check|

h4. Compliance backfill: re-run changeset 236

OR-3057 (#4729, changeset 236-backfill-mayo-insulin-type2-moderate-dose-compliance) rescored Mayo w-insulin-default-dose firings for type 2 patients against the moderate scale. Liquibase ran it once, before the rule changed. Firings since then are scored against the old criteria again, until this ticket deploys.

* 236 selects by rule (type 2 condition, glucose band, dose given), not by hand-picked ids, so a copy with a new changeset id works. Add it in this PR, Mayo only, in the same deploy as the rule change.
* Type 2 gets moderate under both 236 and this ticket (moderate wins), so the copy is correct as is for type 2.
* The other moderate conditions (oral corticosteroids, tube feeds, parenteral nutrition) cannot be backfilled until we know we receive them. Extend the copy only for the inputs confirmed in the table above.

h4. Open questions

# Definition of "thin" (BMI or weight threshold).
# For each input in the table: do we receive it, per site? If not, which scale applies when it is missing?

h4. Acceptance criteria

* One test per condition in each list, and one per overlap example (type 2 + dialysis, type 1 + oral corticosteroids, type 2 + thin, type 2 + prior pancreatectomy), each getting the moderate scale
* A patient with none of the conditions gets the mild scale at a condition-based site
* One test per missing input, matching the spec's Cannot evaluate
* Sites without condition-based criteria behave exactly as today
* The spec delta merges in the same PR as the code
* After deploy, no Mayo type 2 firing is scored against the low scale

