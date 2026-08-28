# OR-2802 — Resolve a multi-procedure case by coverage

Status: Testing   Assignee: Ryan Ducharme

## Description

Reduce several procedures' answers to the regimens that serve all of them at once. An option covers a procedure when it names every drug of at least one of that procedure's surviving options, so a wider regimen answers for a narrower one it contains.

* Only a configured option may be offered: the case never combines two procedures' needs into a regimen nobody wrote
* No ordering: options covering everything are co-equal alternatives
* A procedure surviving nothing decides the case, before coverage is considered
* Optionality is per procedure: the case is optional only when every procedure recommending drugs also offers no antibiotic
* Nothing covering every procedure suppresses rather than guesses

## Comments (0)

(none)
