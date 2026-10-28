# OR-2933 — Vancomycin given to an MRSA-positive patient is flagged as the wrong antibiotic

Status: Testing   Assignee: Ryan Ducharme

## Description

clinical

Depends on OR-2944 ({{a-incomplete-antibiotic-pathway}}). This ticket is written against the rules as OR-2944 leaves them. Blocks OR-2939, which deletes {{w-mrsa-infection-status}}.

The previous description is saved word for word in the comment "Previous description, saved on 2026-10-01".

h2. Problem

A patient who tested MRSA positive needs vancomycin with their prophylaxis. The antibiotic pathways do not know about MRSA, so the prophylaxis alerts judge vancomycin against the plain pathway. A clinician who selects vancomycin for an MRSA-positive patient gets the wrong-antibiotic alert. A case that gets cefazolin without vancomycin raises nothing from the pathway. Reported by Alexandra Wolfe (OR-2170, OR-2201).

h2. Current behavior

The case recommendation comes from the procedure's configured pathways and the patient's allergies (spec antibiotic-prophylaxis-recommendation, R1 to R19). MRSA status is not an input. Only the {{w-mrsa-infection-status}} warning reads it: it shows "MRSA positive on {date}. Consider adding Vancomycin." when an antibiotic other than vancomycin is selected.

For an MRSA-positive patient with pathway "CEFAZOLIN -> VANCOMYCIN -> DAPTOMYCIN":

* {{a-known-procedure-wrong-antibiotic}} fires when vancomycin is selected, because vancomycin is only a fallback.
* {{a-incomplete-antibiotic-pathway}}, nothing given at procedure start: asks for cefazolin only.
* {{a-incomplete-antibiotic-pathway}}, cefazolin given: no alert, because cefazolin alone is a complete option.
* {{a-incomplete-antibiotic-pathway}}, only vancomycin given: no alert, because vancomycin is outside the case's options.
* {{a-known-procedure-antibiotic-not-recommended}}: not affected.

h2. Desired behavior

While the patient is MRSA positive, the system looks for a step 1 that is exactly {{CEFAZOLIN}} or exactly {{CEFAZOLIN AND METRONIDAZOLE}}, and adds vancomycin to it. If vancomycin cannot be given, it adds daptomycin or linezolid in its place, as two alternatives.

||Step 1 as configured||MRSA positive||MRSA positive, vancomycin ruled out||
|CEFAZOLIN|CEFAZOLIN AND VANCOMYCIN|(CEFAZOLIN AND DAPTOMYCIN) OR (CEFAZOLIN AND LINEZOLID)|
|CEFAZOLIN AND METRONIDAZOLE|CEFAZOLIN AND METRONIDAZOLE AND VANCOMYCIN|(CEFAZOLIN AND METRONIDAZOLE AND DAPTOMYCIN) OR (CEFAZOLIN AND METRONIDAZOLE AND LINEZOLID)|

If daptomycin or linezolid is also ruled out, the other one is still offered. If vancomycin, daptomycin, and linezolid are all ruled out, there is no recommendation.

Every other step 1 stays as configured, such as "CEFAZOLIN OR CEFOXITIN" or "CEFAZOLIN AND GENTAMICIN". Fallback steps and "None" pathways never change. MRSA status is read when the recommendation is worked out for the case; an MRSA result that arrives later does not change it, because a case's inputs are set at its start.

"MRSA positive" means an MRSA result in the last 7 days that reads as positive, with no later result that reads as negative. This is the definition {{w-mrsa-infection-status}} uses today.

h2. Affected

* Specs: antibiotic-prophylaxis-recommendation (baseline in https://github.com/guidedclinical/orci/pull/4628, then this change). The specs for {{a-incomplete-antibiotic-pathway}} and {{a-known-procedure-wrong-antibiotic}} point to it and note the MRSA change.
* Rules that change for MRSA-positive patients: {{a-incomplete-antibiotic-pathway}} (both ways of speaking), {{a-known-procedure-wrong-antibiotic}}. The penicillin and cephalosporin allergy alerts that show the recommendation as alternatives also show the new option.
* Rules not changed: {{a-known-procedure-antibiotic-not-recommended}}.
* {{w-mrsa-infection-status}} is deleted by OR-2939 after this ships. This ticket takes over its job.
* Sites: all. The rule is global, with no pathway configuration change.

h2. Constraints

* Only a step 1 that is exactly {{CEFAZOLIN}} or exactly {{CEFAZOLIN AND METRONIDAZOLE}} changes.
* A patient for whom vancomycin is ruled out is never offered a vancomycin option by this change.
* Linezolid must count as an antibiotic given at every site. https://github.com/guidedclinical/orci/pull/4623 added the linezolid medications to the ANTIBIOTIC category at Mayo. MGB and demo still need the same change before this ships, or a linezolid dose there reads as no antibiotic.
* Configured pathways stay as written. The change applies to the recommendation, not to the configuration.
* {{a-incomplete-antibiotic-pathway}} still fires at most once per operation.
* The MRSA reading does not depend on {{w-mrsa-infection-status}}, because OR-2939 deletes that warning.

h2. Open questions

# Any other step 1 gets no MRSA cover: an alternative to cefazolin (MGB 10 rows), or cefazolin with gentamicin or azithromycin (Mayo 3 rows). After OR-2939 deletes the warning, these patients get no MRSA prompt at all, and neither does a case with no matching pathway. Confirm that this is intended.
# A two-procedure case where one procedure is cefazolin alone and the other is cefazolin and gentamicin gets no recommendation for an MRSA-positive patient, because no single option covers both. Today it gets cefazolin and gentamicin. Accept?
# The alerts name vancomycin, daptomycin, or linezolid without saying that MRSA is the reason. Do we want wording that names the MRSA result?
# Which citation does an MRSA option carry? Today {{a-known-procedure-wrong-antibiotic}} cites the procedure's configured pathway. The MRSA guideline citation that {{w-mrsa-infection-status}} uses is one choice.

h2. Acceptance criteria

Filled in with the spec diff once the PM approves it.

## Comments (5)

### Theodore Nguyen-Cao — 2026-10-01T14:34:00

[~accountid:62b9bdcc9e6ba34c99357987] / [~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] so if the patient has MRSA but is allergic to vanco and the pathway wants cefazolin, what do we do? we allow only cefazolin, we have no recommendation, or still want cefazolin AND vanco?

### Theodore Nguyen-Cao — 2026-10-01T15:53:38

*Previous description, saved on 2026-10-01 before the rewrite. Copy it back into the description to revert.*

----

*Current behavior:* [https://guidedclinical.atlassian.net/browse/OR-2170|https://guidedclinical.atlassian.net/browse/OR-2170|smart-link] and [https://guidedclinical.atlassian.net/browse/OR-2201|https://guidedclinical.atlassian.net/browse/OR-2201|smart-link] 

MRSA is handled by one standalone warning, {{w-mrsa-infection-status}} (OR-2170). It is separate from the antibiotic pathway.

It fires when both of these are true:

* MRSA status is active infection, or the latest final test is MRSA-positive within the last 7 days with no later negative.
* An antibiotic is selected.

*Updated behavior*

* GLOBAL RULE: if patient has MRSA, first step of pathway that has Cefazolin, gets Vancomycin added (no addition to “None” rows)

||Rule||Current behavior||Desired behavior (IF MRSA==true)||
|*a-known-procedure-no-antibiotic*|Fires once per case when the procedure starts and nothing from the pathway has been given; lists the pathway's drugs (no vancomycin, since the pathway doesn't know about MRSA).|Same trigger, but the recommendation it lists comes from the TRUE row and so includes vancomycin.|
|*a-known-procedure-wrong-antibiotic*|Fires pre-incision when the selected antibiotic is in no option of the pathway. Vancomycin selected for an MRSA-positive case fires if the base pathway does not name it.|Vancomycin is now in the TRUE row's options, so selecting it abstains.|
|*a-known-procedure-missing-antibiotic*|Fires when a combination is started but not completed before incision.|Fires when antibiotic pathway member is given without the vancomycin — the combination is now incomplete.|
|*a-known-procedure-antibiotic-not-recommended*|Fires when an antibiotic is selected where every procedure wants none.|Unchanged — None rows leave MRSA blank and stay unscoped, so they resolve identically for every MRSA status.|

[https://claude.ai/artifact/7yCgEsqZrS3ycJ6xwCKb1L?sk=hfNRm2i2djJ_cP0dCjZ46w|https://claude.ai/artifact/7yCgEsqZrS3ycJ6xwCKb1L?sk=hfNRm2i2djJ_cP0dCjZ46w|smart-link] 

This will mitigate flagging Vancomycin administration in MRSA cases as an error.

*Out of scope:*

{color:#bf2600}Product: check step 1 antibiotic to not include Clindamycin, Ceftaroline, Linezolid, daptomycin, Dalbavancin, oritavancin, telavancin, TMP-SMX, doxycycline/minocycline, tigecycline{color}

||Row||Procedure||Antibiotic Pathway||
|87|p-missed-abortion-first-trimester|*DOXYCYCLINE* -> AZITHROMYCIN OR METRONIDAZOLE|
|88|p-missed-abortion-second-trimester|*DOXYCYCLINE* -> AZITHROMYCIN OR METRONIDAZOLE|

### Theodore Nguyen-Cao — 2026-10-02T16:51:33

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] we’re saying if the patient is allergic to all 3 alternatives, we would suggest nothing.



similarly if they were allergic to both vanco and linezolid, we would still offer up the path that includes daptomycin

### Alexandra Wolfe — 2026-10-02T16:59:10

[~accountid:62b9bc60228c59d8da18dead] agreed

### Automation for Jira — 2026-10-05T17:11:40

The linked issue - OR-2944 has been resolved

