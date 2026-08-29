# OR-2804 — Scope pathways by case acuity

Status: Testing   Assignee: Ryan Ducharme

## Description

Add case acuity as a second scope beside risk, so an elective caesarean is not offered the regimen written for a labouring one.

* Acuity column on antibiotic-pathways.csv, read through CaseClassification so the file, the feeds and the display share one vocabulary
* One scope predicate over risk and acuity together, shared by the walk and the import check
* A case carrying no acuity matches only pathways naming none
* Import warns for the risk and acuity combinations no pathway of a procedure reaches
* A scheduling message that changes the case's acuity drops the cached resolution

## Comments (0)

(none)
