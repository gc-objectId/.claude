# OR-3012 — Exclude label-permitted bupivacaine and prior lidocaine from the shared allowance when checking liposomal bupivacaine (Exparel)

Status: Testing   Assignee: Ryan Ducharme

## Description

*Depends on:* OR-3032 (liposomal bupivacaine category and 266 mg maximum)

*Rules affected:* {{a-local-anesthetic-max-dose-save}}, {{a-local-anesthetic-max-dose-scan}}, {{w-last-local-anesthetic-max-dose}}, {{i-last-local-anesthetic}} (shares the same calculation)

The shared local-anesthetic allowance counts plain bupivacaine and lidocaine against liposomal bupivacaine. The label permits both, so a full liposomal bupivacaine dose given with permitted bupivacaine or lidocaine raises an alert.

*Now:* every local anesthetic in the window counts toward one allowance.

*After:* when liposomal bupivacaine is the dose being checked, two earlier doses no longer count against the allowance:

* Plain bupivacaine given from 5 minutes before it up to the same minute, at not more than half its dose in mg. At save, the limit is half the actual liposomal dose. At selection (scan, w-last, i-last), the dose isn't known yet, so the limit is 133 mg, half the 266 mg maximum.
* Lidocaine given at any time before it.

Plain bupivacaine above the limit counts in full. Both exclusions apply only to the liposomal bupivacaine dose. A later dose of any other local anesthetic counts them as it does today. Excluded doses still appear in the prior dose list shown to the clinician. All other combinations are unchanged.

*Example*

70 kg adult. 100 mg plain bupivacaine at 10:02, 266 mg liposomal bupivacaine at 10:05.

Now: the bupivacaine uses 57% of the allowance, the liposomal dose exceeds what remains, and the save alert fires.

After: the bupivacaine is excluded (100 mg is not more than 133 mg). The liposomal dose is 100% of its own maximum, so no alert fires. The bupivacaine still appears in the prior dose list.

*Spec change*

The following is written into all four specs:

{noformat}## Clinical overview (after the shared-allowance paragraph)
+ When liposomal bupivacaine is the dose being checked, two earlier doses do not
+ count against the shared allowance, because its label permits them:
+ - plain bupivacaine given from 5 minutes before it up to the same minute, at not
+   more than half its dose in milligrams
+ - lidocaine given at any time before it
+ Plain bupivacaine above half the dose counts in full. Both exclusions apply only
+ to the liposomal bupivacaine dose: a later dose of any other local anesthetic
+ counts them as today. Every dose stays in the list of prior doses shown to the
+ clinician.

## Clinical overview (scan, w-last, i-last only)
+ At selection the liposomal bupivacaine dose is not known yet, so plain
+ bupivacaine is excluded when it is not more than 133 mg, half the 266 mg maximum.

## Known gaps (scan, w-last, i-last only)
+ The selection check uses 133 mg in place of half the actual dose. A smaller
+ liposomal dose can pass at selection and then alert when the dose is saved.

## History
+ <date> · OR-3012 · Label-permitted bupivacaine and prior lidocaine no longer count
+ against liposomal bupivacaine, because a label-correct dose raised an alert.{noformat}

*Decided*

* 5-minute window, measured in mg. The ratio comes from the label (133 mg at 266 mg, 100 mg at 200 mg).
* At selection (scan, w-last, i-last), the 133 mg stand-in applies. Save uses half the actual dose.
* Bupivacaine over the limit counts in full.
* Both exclusions apply only to the liposomal bupivacaine dose. For example, with lidocaine, then liposomal bupivacaine, then ropivacaine, the lidocaine counts for the ropivacaine.
* Excluded doses still show in the prior dose list.

*Scenarios*

||#||Sequence||Rule||Fires?||Reason||Display||
|1|Lidocaine to maximum, then liposomal bupivacaine|a-scan, w-last, i-last, a-save|No|Lidocaine before liposomal bupivacaine is excluded|Lidocaine is shown in the prior dose list. It is excluded only from the calculation.|
|2|Maximum lidocaine, then plain bupivacaine|a-scan, w-last, i-last, a-save|Yes|Plain bupivacaine is not liposomal bupivacaine|No change|
|3|Liposomal bupivacaine, then lidocaine|a-scan, w-last, i-last, a-save|Yes|Lidocaine after liposomal bupivacaine is counted|No change|
|4|Ropivacaine to maximum, then liposomal bupivacaine|a-scan, w-last, i-last, a-save|Yes|Ropivacaine is not excluded|No change|
|5|Plain bupivacaine up to maximum, more than 5 minutes before liposomal bupivacaine|a-scan, w-last, i-last, a-save|Yes|Outside the pairing window, so it counts in full|No change|
|6|Plain bupivacaine 5 minutes or less before liposomal bupivacaine, at more than 133 mg (selection) or more than half the liposomal dose (save)|a-scan, w-last, i-last, a-save|Yes|Exceeds the label limit for co-administered bupivacaine|No change|
|7|Plain bupivacaine 133 mg or less, 5 minutes or less before liposomal bupivacaine|a-scan, w-last, i-last, a-save|Depends|Counts in full when the liposomal dose is less than twice the bupivacaine dose. The alert then fires only if the total exceeds the allowance.|No change|
|8|Lidocaine, then liposomal bupivacaine, then ropivacaine|a-scan, w-last, i-last, a-save|Depends (for ropivacaine)|The exclusion applies only to the liposomal dose. Lidocaine counts toward the ropivacaine check.|All doses shown in the prior dose list|

*Acceptance criteria*

* Each scenario row has a test, named for the row, for each of the four rules.
* Selection uses 133 mg. Save uses half the actual dose.
* A later dose of another local anesthetic counts the excluded doses.
* Excluded doses show in the prior dose list.
* All four spec deltas merge in the same PR as the code.

## Comments (2)

### Theodore Nguyen-Cao — 2026-10-22T15:45:11

h3. Proposed spec change (not approved)

Rules: {{a-local-anesthetic-max-dose-save}}, {{a-local-anesthetic-max-dose-scan}}, {{w-last-local-anesthetic-max-dose}}, {{i-last-local-anesthetic}}. The last one shares the same calculation and is not named in the description. Depends on OR-3032 (liposomal bupivacaine category and 266 mg maximum).

h4. Spec delta, written into all four specs

{noformat}## Clinical overview (after the shared-allowance paragraph)
+ When liposomal bupivacaine is the dose being checked, two earlier doses do not
+ count against the shared allowance, because its label permits them:
+ - plain bupivacaine given from 5 minutes before it up to the same minute, at not
+   more than half its dose in milligrams
+ - lidocaine given at any time before it
+ Plain bupivacaine above half the dose counts in full. Both exclusions apply only
+ to the liposomal bupivacaine dose: a later dose of any other local anesthetic
+ counts them as today. Every dose stays in the list of prior doses shown to the
+ clinician.

## Clinical overview (scan, w-last, i-last only)
+ At selection the liposomal bupivacaine dose is not known yet, so plain
+ bupivacaine is excluded when it is not more than 133 mg, half the 266 mg maximum.

## Known gaps (scan, w-last, i-last only)
+ The selection check uses 133 mg in place of half the actual dose. A smaller
+ liposomal dose can pass at selection and then alert when the dose is saved.

## History
+ <date> · OR-3012 · Label-permitted bupivacaine and prior lidocaine no longer count
+ against liposomal bupivacaine, because a label-correct dose raised an alert.{noformat}

h4. Decided

* At selection (scan, w-last, i-last), the 133 mg stand-in limit applies. Save uses half the actual dose.
* Both exclusions apply only to the liposomal bupivacaine dose. Example: lidocaine, then liposomal bupivacaine, then ropivacaine. The lidocaine counts for the ropivacaine.
* Excluded doses still show in the prior dose list.

h4. Corrections to the scenario table

* Row 1, Display: lidocaine is shown in the prior dose list. It is excluded only from the calculation.
* Row 6: the condition is "more than half the liposomal dose" at save, and "more than 133 mg" at selection. "min(133 mg, bupivacaine max dose)" adds a condition the rule does not have.
* Row 7: the bupivacaine counts in full when the liposomal dose is less than twice it. The alert then fires only if the total exceeds the allowance, so "Depends" is right but the reason is "counts in full", not "fires".

h4. Acceptance criteria

* Each scenario row has a test, named for the row, for each of the four rules
* Selection uses 133 mg; save uses half the actual dose
* A later dose of another local anesthetic counts the excluded doses
* Excluded doses show in the prior dose list
* All four spec deltas merge in the same PR as the code

### Alexandra Wolfe — 2026-10-23T15:17:10

[~accountid:62b9bc60228c59d8da18dead] incorporated

