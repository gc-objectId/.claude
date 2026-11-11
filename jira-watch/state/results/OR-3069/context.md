# OR-3069 — Rescore Mayo cefazolin redose firings against 2 g

Status: Testing   Assignee: Ryan Ducharme

## Description

*Background*

Before OR-2941, w-default-dose-adjustment set 3 g for every cefazolin selection for an overweight adult, redoses included. The guideline redoses with 2 g when CrCl is 50 or more. OR-2941 fixes this from now on. Mayo's existing firings still record a 3 g default, and they score a 2 g redose as non-compliant.

*Change*

A Mayo-only tenant changeset (mayo-mayo). For each w-default-dose-adjustment cefazolin firing that meets all of these:

* overweight;
* a redose (an earlier cefazolin bolus in the same operation by a recognized antibiotic route, from 1 minute before operation start);
* CrCl 50 or more, or unknown, read from the a-antibiotic-early-redose result of the same evaluation;
* an administration with a dose in g or mg;

set the stored default dose to 2 g and rescore the default-dose compliance against 2 g.

*Acceptance criteria*

* Only mayo-mayo is changed; other tenants mark the changeset as run.
* Firings outside the scope above are not changed.
* The stored default dose and the verdict agree, so a later compliance recompute does not revert the verdict.
* Rows with no usable dose are left alone.

## Comments (0)

(none)
