# OR-2800 — Add the pathway configuration format and importer

Status: Testing   Assignee: Ryan Ducharme

## Description

Give prophylaxis a configuration format that can state a route with its own fallbacks, and import it. Nothing reads the new tables in this step.

* Notation in antibiotic-pathways.csv: -> for the next step, OR for alternatives within a step, AND for drugs given together, parentheses for grouping, None for no prophylaxis
* AntibioticPathway and AntibioticPathwayOption entities, tenant tables, and the medication category join table with the category order preserved
* AntibioticPathwayCSVImporter, which parses before it deletes and refuses to replace a populated tenant with nothing
* Migrate demo, MGB and Mayo configuration, one pathway per scope of the ranked file, ranks becoming steps

## Comments (1)

### Automation for Jira — 2026-08-26T19:48:11

The linked issue - OR-2777 has been resolved

