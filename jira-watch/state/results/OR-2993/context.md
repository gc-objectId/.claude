# OR-2993 — Antibiotic rules ignore doses given through a gastric tube

Status: Testing   Assignee: Ryan Ducharme

## Description

clinical

h2. Problem

The antibiotic rules count a dose only when its route is on a fixed list of recognized antibiotic routes. {{GASTRIC_TUBE}} (NG, NJ, OG) is not on the list, while {{ORAL}} and {{GASTROSTOMY_TUBE}} are. An antibiotic given through an NG tube reaches the patient the same way as an oral dose, but the rules treat it as never given. At Mayo prod, 595 antibiotic doses are on {{GASTRIC_TUBE}}; {{GASTROSTOMY_TUBE}} has almost no traffic.

The redose reminder scheduler also kept its own copy of the route list, so the two lists could drift apart.

Separately, merging the procedure-start antibiotic rules (OR-2944) left two behaviors of {{a-incomplete-antibiotic-pathway}} untested: the lookback and route filters on the partial branch, and the stored {{PATHWAY_STATUS}} text that the Mayo no-antibiotic report filters on.

h2. Current behavior

An antibiotic dose on {{GASTRIC_TUBE}} does not count. {{a-incomplete-antibiotic-pathway}} can tell the room that a patient who received one through an NG tube received no antibiotic. The dose does not complete a combination, does not count toward a redose, and does not schedule a redose reminder.

h2. Desired behavior

An antibiotic dose on {{GASTRIC_TUBE}} counts as given in every antibiotic rule, the same as {{ORAL}} and {{GASTROSTOMY_TUBE}}. All antibiotic rules and the redose scheduler read one route list. The Mayo no-antibiotic report counts the same routes as the rule.

h2. Affected

{{a-incomplete-antibiotic-pathway}}, {{a-antibiotic-redose-reminder}}, {{a-antibiotic-redose-reminder-no-crcl}}, {{a-antibiotic-early-redose}}, {{a-antibiotic-early-redose-no-crcl}}, {{a-known-procedure-wrong-antibiotic}}, {{a-ebl-antibiotic-redose-reminder}}, {{a-antibiotic-infusion-pre-incision-completion}}, and the selection rules that skip unrecognized antibiotic routes. Report: {{mayo-mayo/metrics/no_antibiotic_alert_detail.sql}}.

h2. Constraints

Routes that cannot deliver a systemic dose (topical, intraocular, nasal, infiltration, and similar) stay excluded. Migration 192 is history and keeps its route list.

h2. Open questions

{{UNKNOWN}} route is still excluded (2,072 antibiotic doses at Mayo prod). Those are likely unmapped routes and need their own decision.

h2. Acceptance criteria

h3. Worked example

A hysterectomy case recommends cefazolin with metronidazole. Metronidazole is given IV and cefazolin through an NG tube, both inside the window. The rule sees the combination as complete and does not alert. With only the NG cefazolin given, the rule reports the combination as partly given, not as nothing given.

h3. Decided beyond the problem

{{GASTRIC_TUBE}} is treated exactly like {{ORAL}} for every antibiotic rule, including redose reminders.

h3. Specs and rules

No rule spec lists the recognized routes. Rule identifiers as listed under Affected.

## Comments (0)

(none)
