---
name: project-or2780-wrong-dose-deep-dive
description: OR-2780 Mayo wrong-dose error rate is almost entirely the LAST protocol rules; 71% is a flat 100 mg IV lidocaine bolus against a 1.5 mg/kg cap
metadata:
  type: project
---

Mayo's "Wrong Dose" error rate for the four medications Alex flagged (2026-08-04 onward,
2217 non-compliant firings, all SILENT) resolves to exactly three rules, all LAST protocol:
`w-last-local-anesthetic-max-dose`, `a-local-anesthetic-max-dose-save`,
`a-local-anesthetic-max-dose-scan`. No dose-adjustment, default-dose or indication rule fires
on these meds — they are absent from `DoseAdjustments.xlsx`, `indication-thresholds.csv`, and
carry no MAX DOSE OPTIONS or DEFAULT DOSES in `medication-dosing.csv`.

**The dominant pattern (71% of all firings): a flat 100 mg IV lidocaine bolus.** IV lidocaine's
cap is hardcoded at 1.5 mg/kg in `LASTProtocolService.getMgPerKgMultiplier` (4.5 mg/kg other
routes), so 100 mg exceeds it for any patient under ~67 kg. Observed caps of 75-92 mg imply
50-61 kg patients. 90% of those firings had no prior local anesthetic, median overage 1.19x.
This is routine practice meeting a tight weight-based cap, not dose stacking.

**Two things that are easy to get wrong here, both checked against prod data:**
- Every firing has a matching administration (0 of 2217 without). Selection-trigger alerts do
  *not* fire into an empty denominator. A rate above 100% comes from the warning and the save
  alert both firing on one dose event at different instants (934 vs 931 for lidocaine), and from
  repeated scans of one dose.
- Most firings are *single-dose* exceedances, not cumulative accrual: 72-77% have
  `remaining_allowed_dose == intended_max_dose`, meaning no prior anesthetic in the case.

**`m-cocaine-4-nasal` was a config defect, already fixed.** Added 2026-07-30 categorized
`COCAINE | LOCAL_ANESTHETIC`, which is the only gate the LAST rules read. Alex removed the
category in `14bd0db28` (PR #4407, release 0.1.91). Its 11 firings run 2026-08-06 to 08-12 and
stop, while every other med continues to 08-28; it will not recur.

**Why:** Alex asked which rule triggered each non-compliance and what the expected value was.
The expected value is `remaining_allowed_dose` at firing time, not a fixed per-dose cap.

**How to apply:** the Mayo rollup matviews lag (see [[project_or2747_mayo_matview_refresh]]) --
the card read 403 for lidocaine where live tables gave 718 over the same window, so refresh
before quoting. Query the live tables instead when the number must be current. Related:
[[reference_analytics_sql_local_validation]], [[reference_mgh_data_not_in_aws_rds]].
