# OR-2803 — Scope pathways by procedure risk

Status: Testing   Assignee: Ryan Ducharme

## Description

Let a procedure state a different route per infection risk, so the pancreatectomy protocols stop competing as tiers of one ladder.

* Risk column on antibiotic-pathways.csv; a pathway naming no risk applies at every risk
* Risk narrows which pathways are in scope before the walk, so a pathway written for the other risk level can neither survive nor die
* A case carrying no risk reads as LOW, because stratification is best-effort and an absent value means it did not run

## Comments (0)

(none)
