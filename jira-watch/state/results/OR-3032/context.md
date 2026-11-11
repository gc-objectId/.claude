# OR-3032 — LAST: set the liposomal bupivacaine maximum to 266 mg and give it its own category at every site

Status: Testing   Assignee: Ryan Ducharme

## Description

*Blocks:* OR-3012

*Rules affected:* {{a-local-anesthetic-max-dose-save}}, {{a-local-anesthetic-max-dose-scan}}, {{w-last-local-anesthetic-max-dose}}, {{i-last-local-anesthetic}}

Two changes to liposomal bupivacaine:

* Remove 4 mg/kg from the maximum dose calculation and keep only the 266 mg limit (adults; pediatric to be confirmed).
* Rename the category from EXPAREL to BUPIVACAINE_LIPOSOME, and give it to every site's liposomal bupivacaine product, Mayo included.

*This is a code change, not only config*

* The 4 mg/kg and the 266 mg cap are both in the LAST calculation code, not in a dosing file. The dosing file only lists "133 mg, 266 mg, 4 mg/kg" as dose options.
* Mayo's {{m-bupivacaine-liposome}} has primary category BUPIVACAINE, not EXPAREL. So at Mayo none of the liposomal logic runs today: there is no 266 mg cap, the lookback is 24 hours instead of 5 days, and the maximum is the 2.5 mg/kg plain bupivacaine one. The rename must also give Mayo's product the new category, or the rename and OR-3012 change nothing at Mayo.
* Rename scope: the category constant, the master medication lists, and the LAST tests. No SQL or analytics use of 'EXPAREL' was found.

*Desired behavior*

* The liposomal bupivacaine maximum is 266 mg for an adult, whatever the weight.
* Pediatric: to be confirmed. The label gives 4 mg/kg up to 266 mg for patients aged 6 and older. A flat 266 mg would allow a 25 kg pediatric patient more than 10 mg/kg.
* The category is named BUPIVACAINE_LIPOSOME. Every site's liposomal bupivacaine product carries it, Mayo included.

*Spec change*

The following is written into all four specs:

{noformat}## Clinical overview
+ Liposomal bupivacaine has a fixed maximum of 266 mg for an adult, not a
+ per-kilogram maximum.

## History
+ <date> · OR-3032 · Liposomal bupivacaine has a fixed 266 mg adult maximum, because
+ its label sets one dose limit rather than a per-kilogram limit.{noformat}

*Example*

Mayo, 50 kg adult whose ideal weight is not below 50 kg (LAST uses the lower of actual and ideal weight). 266 mg liposomal bupivacaine by nerve block.

Now: counted as plain bupivacaine against 2.5 mg/kg × 50 kg = 125 mg. The save alert fires.  
After: counted against 266 mg. It is 100% of its maximum, so no alert fires.

*Open questions*

* Pediatric patients: keep 4 mg/kg up to 266 mg, or 266 mg flat for everyone?

*Acceptance criteria*

* A 50 kg and a 120 kg adult both get a 266 mg maximum.
* Mayo liposomal bupivacaine uses the 5-day lookback and the 266 mg maximum.
* Pediatric behavior matches the confirmed answer.
* No product at any site still carries the EXPAREL category.
* The spec delta merges in the same PR as the code.

## Comments (4)

### Theodore Nguyen-Cao — 2026-10-22T15:51:15

h3. Proposed scope (not approved)

Suggested title: LAST: set the liposomal bupivacaine maximum to 266 mg and give it its own category at every site

Rules: {{a-local-anesthetic-max-dose-save}}, {{a-local-anesthetic-max-dose-scan}}, {{w-last-local-anesthetic-max-dose}}, {{i-last-local-anesthetic}}. Blocks OR-3012.

h4. This is a code change, not only config

* The 4 mg/kg and the 266 mg cap are both in the LAST calculation code, not in a dosing file. The dosing file only lists "133 mg, 266 mg, 4 mg/kg" as dose options.
* Mayo's m-bupivacaine-liposome has primary category BUPIVACAINE, not EXPAREL. So at Mayo none of the liposomal logic runs today: no 266 mg cap, a 24-hour lookback in place of 5 days, and a 2.5 mg/kg plain bupivacaine maximum. The rename must also give Mayo's product the new category, or the rename and OR-3012 change nothing at Mayo.
* Rename scope: the category constant, the master medication lists, and the LAST tests. No SQL or analytics use of 'EXPAREL' found.

h4. Desired behavior

* The liposomal bupivacaine maximum is 266 mg for an adult, whatever the weight.
* Pediatric: to be confirmed. The label gives 4 mg/kg up to 266 mg for patients aged 6 and older. A flat 266 mg allows a 25 kg pediatric patient more than 10 mg/kg.
* The category is named BUPIVACAINE_LIPOSOME. Every site's liposomal bupivacaine product carries it, Mayo included.

h4. Spec delta (all four specs, Clinical overview)

{noformat}+ Liposomal bupivacaine has a fixed maximum of 266 mg for an adult, not a
+ per-kilogram maximum.

## History
+ <date> · OR-3032 · Liposomal bupivacaine has a fixed 266 mg adult maximum, because
+ its label sets one dose limit rather than a per-kilogram limit.{noformat}

h4. Worked example

Mayo, 50 kg adult whose ideal weight is not below 50 kg (LAST uses the lower of actual and ideal weight). 266 mg liposomal bupivacaine by nerve block.

* Now: counted as plain bupivacaine against 2.5 mg/kg x 50 kg = 125 mg. The save alert fires.
* After: counted against 266 mg. 100% of its maximum, no alert.

h4. Open question

* Pediatric patients: keep 4 mg/kg up to 266 mg, or 266 mg flat for everyone?

h4. Acceptance criteria

* A 50 kg and a 120 kg adult both get a 266 mg maximum
* Mayo liposomal bupivacaine uses the 5-day lookback and the 266 mg maximum
* Pediatric behavior matches the confirmed answer
* No product at any site still carries the EXPAREL category
* The spec delta merges in the same PR as the code

### Alexandra Wolfe — 2026-10-23T15:50:00

[~accountid:62b9bc60228c59d8da18dead] added

### Jordan Ephron — 2026-10-29T15:22:30

so, to summarize what I understand about this ticket

# recategorize {{g-exparel}} at MGB from EXPAREL to BUPIVACAINE_LIPOSOME
# add BUPIVACAINE_LIPOSOME to mayo’s {{m-bupivacaine-liposome}}
# update LASTProtocolService to look at BUPIVACAINE_LIPOSOME instead of EXPAREL
# remove the 4 mg/kg nerve-block exparel path from LASTProtocolService
*question*: should MGB continue to use the 4mg/kg limit for bupivacaine-liposome?
# todo on pediatrics

### Alexandra Wolfe — 2026-11-04T18:32:34

[~accountid:640bbd89896d10ebd4754d07] 

1. added bupivacaine_liposome

# done
# not for product
# correct
# TBD

