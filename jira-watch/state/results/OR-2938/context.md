# OR-2938 — Test Vancomycin infusions in cases with EBL > 1500mL

Status: Testing   Assignee: Ryan Ducharme

## Description

To test in TST: 

Desired behavior: vancomycin infusion trigger EBL reminders. 

## Comments (3)

### Theodore Nguyen-Cao — 2026-10-13T15:46:18

we only look at boluses for this rule for antibiotics and vanco.

### Theodore Nguyen-Cao — 2026-10-22T15:37:38

We only look at boluses for both the antibiotic and the vanco criteria. are we saying we only want to add infusions to the vanco criteria or we should also be looking for infusion antibiotics?

the timeline for vanco says it’s an intraop vanco - for infusions are we looking for a vanco infusion since the start of the case or what’s the timeline?

### Alexandra Wolfe — 2026-10-23T13:36:09

[~accountid:62b9bc60228c59d8da18dead] Infusions added to the criteria, but only for vancomycin, started as far back as lookback period

