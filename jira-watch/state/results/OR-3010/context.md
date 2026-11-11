# OR-3010 — Mayo: base the vancomycin default dose on actual body weight

Status: Testing   Assignee: Ryan Ducharme

## Description

Mayo’s default IV vancomycin dose is 15 mg/kg of ideal body weight, falling back to actual weight only when actual is at or below ideal. MGB does not calculate from weight at all. It picks a fixed dose by actual-weight group. This change moves Mayo to actual body weight. MGB is unaffected.

This is a Mayo configuration change. No spec change is needed, because {{w-default-dose-adjustment}} already takes the weight type from the site's dose adjustment table. Code change: probably none. The engineer confirms that the “actual if at or below ideal” fallback belongs to the Ideal weight type and does not apply to Actual.

*Current behavior (Mayo, adults)*

The default is 15 mg/kg of ideal body weight. If actual weight is at or below ideal, actual is used instead. The result is rounded to the nearest 0.25 g.

*After (Mayo, adults)*

The default is 15 mg/kg of actual body weight. The ideal-weight calculation and the “actual if at or below ideal” rule no longer apply. Rounding, dose options, the upper limit, and the no-default-after-non-default rule are unchanged.

*Example*

Adult male, 1.75 m, actual weight 110 kg. Ideal weight about 70 kg.  
Now: 15 × 70 = 1050 mg, rounds to 1 g.  
After: 15 × 110 = 1650 mg, rounds to 1.75 g.

*Rule by rule*

||Behavior||Now||After||
|Weight basis for default (Mayo)|Ideal body weight, or actual if at or below ideal|Actual body weight|
|Rounding|Nearest 0.25 g|Unchanged|
|Dose options, upper limit, no default after a non-default dose|Current behavior|Unchanged|
|Mayo vancomycin citations|Another site's guideline (fixed dose by weight group)|Updated with all citations for live mode|
|MGB|Fixed dose by actual-weight group|Unchanged|

*Changes*

* Mayo dose adjustment table, sheet Normal, row {{m-vancomycin-iv}}: change Type of Weight from Ideal to Actual.
* Mayo citations {{r-vancomycin-iv-default-dose}} and {{r-vancomycin-iv-underweight-dose}}: today they show another site's guideline ("1.5 g for patient wt 75-100 kg", "1 g for patient wt <75 kg") next to a 15 mg/kg Mayo dose. These will be replaced together with all the citations for live mode, not in this ticket.
* A new compliance backfill changeset, in the same PR (see below).

*Compliance backfill: re-run changeset 237*

OR-3011 (#4731, changeset {{237-mark-vancomycin-default-dose-ideal-vs-actual-weight-compliant}}) marked Mayo vancomycin {{w-default-dose-adjustment}} firings compliant where the dose given matched actual body weight. Liquibase runs it once, and it ran before the Mayo config changed. Every vancomycin firing since then is scored against the ideal-weight default again, and this will continue until this ticket deploys.

Changeset 237 is a hand-selected list of compliance result ids (Metabase question 87), not a rule. A copy with a new id and the same ids changes nothing, because the new firings have new ids.

* *Recommended:* a new changeset that selects by rule. The criteria are Mayo prod, {{w-default-dose-adjustment}}, label {{default-dose}}, vancomycin, non-compliant, and the dose given equals 15 mg/kg of actual weight rounded to the nearest 0.25 g. Confirm that the firing stores the patient's actual weight. If it doesn't, read it from the case.
* *Alternative:* run Metabase question 87 again just before release and hand-select the new ids, as 237 did.

Keep it Mayo-only and context {{@prod}}, like 237. Ship it in the same deploy as the config change, so no firing falls between the two.

*Open questions*

* Mayo citation text and link for the 15 mg/kg actual-weight default and the underweight dose: will be done with all the citations for live mode.
* Upper limit: confirm the existing limit still caps a heavy patient (150 kg × 15 = 2.25 g). Asked clinical, waiting for answer. Conclusion: need to confirm with Mayo. (Alex)

*Acceptance criteria*

* The worked example preselects 1.75 g at Mayo.
* Rounding, dose options, upper limit, and “no default after a non-default dose” are unchanged.
* After deploy, no Mayo vancomycin firing is non-compliant where the dose given equals 15 mg/kg of actual weight, rounded.
* OR-3011 (analytics) is complete.

## Comments (6)

### Theodore Nguyen-Cao — 2026-10-22T15:47:56

h3. Proposed scope (not approved)

Suggested title: Mayo: base the vancomycin default dose on actual body weight

This is a Mayo configuration change. No spec change: {{w-default-dose-adjustment}} already says the weight type comes from the site's dose adjustment table. Code change: probably none. The engineer confirms that the "actual if at or below ideal" fallback belongs to the Ideal weight type and does not apply to Actual.

h4. Changes

* Mayo dose adjustment table, sheet Normal, row m-vancomycin-iv: Type of Weight Ideal -> Actual.
* Mayo citations r-vancomycin-iv-default-dose and r-vancomycin-iv-underweight-dose: replace the text and link. Today they show another site's guideline ("1.5 g for patient wt 75-100 kg", "1 g for patient wt <75 kg") next to a 15 mg/kg Mayo dose.
* A new compliance backfill changeset, in the same PR (see below).

h4. Compliance backfill: re-run changeset 237

OR-3011 (#4731, changeset 237-mark-vancomycin-default-dose-ideal-vs-actual-weight-compliant) marked Mayo vancomycin w-default-dose-adjustment firings compliant where the dose given matched actual body weight. Liquibase runs it once, and it ran before the Mayo config changed. Every vancomycin firing since then is scored against the ideal-weight default again, until this ticket deploys.

* 237 is a hand-selected list of compliance result ids (Metabase question 87), not a rule. A copy with a new id and the same ids changes nothing, because the new firings have new ids.
* Recommended: a new changeset that selects by rule: Mayo prod, w-default-dose-adjustment, label default-dose, vancomycin, non-compliant, and the dose given equals 15 mg/kg of actual weight rounded to the nearest 0.25 g. Confirm the firing stores the patient's actual weight; if not, read it from the case.
* Alternative: run Metabase question 87 again just before release and hand-select the new ids, as 237 did.
* Keep it Mayo-only and context @prod, like 237. Ship it in the same deploy as the config change, so no firing falls between the two.

h4. Worked example

Adult male, 1.75 m, 110 kg. Ideal weight about 70 kg. Now: 15 x 70 = 1050 mg -> 1 g. After: 15 x 110 = 1650 mg -> 1.75 g.

h4. Open questions

* Mayo citation text and link for the 15 mg/kg actual-weight default and the underweight dose. (Alex)
* Upper limit: confirm the existing limit still caps a heavy patient (150 kg x 15 = 2.25 g). (Alex)

h4. Acceptance criteria

* The worked example preselects 1.75 g at Mayo
* Both Mayo vancomycin citations show Mayo's reference
* Rounding, dose options, upper limit, and "no default after a non-default dose" are unchanged
* After deploy, no Mayo vancomycin firing is non-compliant where the dose given equals 15 mg/kg of actual weight, rounded
* OR-3011 (analytics) is complete

### Theodore Nguyen-Cao — 2026-10-22T15:48:46

Is this suppose to be mayo only or should apply elsewhere?

### Alexandra Wolfe — 2026-10-23T15:18:36

[~accountid:62b9bc60228c59d8da18dead] Asked, pending answer

### Alexandra Wolfe — 2026-10-23T15:25:00

[~accountid:62b9bc60228c59d8da18dead] incorporated. I favor the recommended pathway for analytics update.

### Alexandra Wolfe — 2026-10-23T18:08:00

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] This is just mayo actually, mgh has intervals not weight based

### Automation for Jira — 2026-11-02T15:36:19

The linked issue - OR-3011 has been resolved

