# OR-2801 — Resolve a single procedure by walking its pathways

Status: Testing   Assignee: Ryan Ducharme

## Description

Turn one procedure's pathways into the regimens that are safe for this patient.

* An option dies whole: one contraindicated drug rules out the regimen it belongs to
* A step survives if any of its options survives, and a pathway stops at its first surviving step
* Pathways do not rank each other, so each keeps its own fallback and survivors pool across them
* Every pathway must survive: one that loses every step leaves the procedure recommending nothing, because the route it states has no answer for this patient
* OPTIONAL_PROPHYLAXIS outcome for a procedure offering both drugs and no antibiotic; a None pathway does not rescue a procedure whose drug pathways died
* Alerts name what survived for the patient, not the whole configuration

## Comments (0)

(none)
