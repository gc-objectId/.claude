# OR-2748 — Local anesthetic rules abort on any remaining dose >= 1000 mg (thousands separator)

Status: Testing   Assignee: Ryan Ducharme

## Description

The remaining allowed dose is written into the rule details as display text and then parsed back as a number. The display form carries a grouping separator, so once the remaining dose reaches 1000 mg the parse throws NumberFormatException and the rule aborts. No guidance is produced and nothing surfaces to the clinician.

Where 

* LASTCommon:73 writes REMAINING_ALLOWED_DOSE via twoDecimalFormat.format(...)
* NumberFormatters.formatUpToXDecimalPlaces(2, DOWN) builds the pattern #,##0.## - grouping separator included
* AbstractLocalAnestheticWarningOrInfoRule:418 and :460 call Double.parseDouble on that string

Only the WARNING path reaches it. The INFO rule returns early for citations and its prompt text never reads the dose.

Reachability

LASTCommon.getTypedWeight:205-211 doses on ObjectUtils.min(actual, ideal), the lesser of actual and ideal body weight. Ideal body weight is height-bounded at roughly 91 kg, which keeps mg/kg x weight below 1000 mg for nearly every local anesthetic:

||Agent||mg/kg||IBW for 1000 mg||Reachable||
|Lidocaine IV|1.5|667 kg|no|
|Bupivacaine, ropivacaine|2.5-3.5|286-400 kg|no|
|Lidocaine non-IV|4.5|223 kg|no|
|Mepivacaine|5|200 kg|no|
|Lidocaine+epi, mepivacaine+epi|7|143 kg|no|
|Chloroprocaine|11|91 kg|edge|
|Chloroprocaine 2% + epinephrine|14|72 kg|yes|

Mayo's master medication list contains m-chloroprocaine-2-epinephrine (14 mg/kg), which crosses 1000 mg at an ordinary adult ideal body weight. MGB's list has no epinephrine chloroprocaine variant. Mayo has not administered it to date, so the defect is reachable on that tenant but not currently active.

Fix

Read the raw numeric value rather than re-parsing the display string. LASTCommon:69 already writes the same quantity into the same details map as a double under REMAINING_ALLOWED_DOSE_AMOUNT_MG. Keep the formatted string for display only.

Also worth checking: w-acetaminophen-max-dose is the only rule observed storing a comma-bearing REMAINING_ALLOWED_DOSE. Acetaminophen ceilings are flat rather than weight-derived, so the ideal-body-weight bound above does not protect it.

## Comments (0)

(none)
