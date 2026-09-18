# OR-2921 — a-preop-doxycycline-check update

Status: Testing   Assignee: Ryan Ducharme

## Description

If more than one procedure is mapped, and the antibiotic recommendations are different, we should not make a recommendation (unless it’s one of our exceptions, e.g. Whipple + Biliary stent)

We erroneously recommended doxycycline: 

|01a06c83-b983-7eca-8a8d-e02fe458bae9|September 4, 2026, 8:02 AM|Dilation and Curettage; Hysterectomy; Hysteroscopy|a-preop-doxycycline-check| | | | | | | | |Delayed/Missed/Wrong Antibiotic|{"EVALUATION_DATE":1788526967160}|
|01a06388-ab7d-7945-8219-41a250f224d4|September 2, 2026, 2:11 PM|Dilation and Curettage; Hysterectomy|a-preop-doxycycline-check| | | | | | | | |Delayed/Missed/Wrong Antibiotic|{"EVALUATION_DATE":1788376296306}|
|01a06233-7294-7bc2-a578-9497a1ce83f4|September 2, 2026, 7:58 AM|Dilation and Curettage; Hysterectomy; Hysterectomy Laparoscopic; Hysteroscopy; Laparoscopic salpingo-oophorectomy surgery|a-preop-doxycycline-check| | | | | | | | |Delayed/Missed/Wrong Antibiotic|{"EVALUATION_DATE":1788353933963}|
|01a05800-ee6b-729e-8276-095565dd08d9|August 31, 2026, 8:27 AM|Cystoscopy; Dilation and Curettage; ENT clean procedures; Exam under anesthesia; Hysterectomy; Hysteroscopy|a-preop-doxycycline-check| | | | | | | | |Delayed/Missed/Wrong Antibiotic|{"EVALUATION_DATE":1788182851169}|

We need to supress a-preop-doxycycline if there are multiple procedures in the case that don’t recommend no antibiotics.

## Comments (5)

### Theodore Nguyen-Cao — 2026-09-12T01:09:11

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] a-preop-doxycycline is different from any logic we do with antibiotic candidates pathways. what are we saying we need to do here?



We currently look at 

{noformat}"p-dilation-and-evacuation-nonpregnancy",
"p-dilation-and-evacuation-abortion",
"p-dilation-and-evacuation-postpartum",
"p-dilation-and-evacuation-other",
"p-dilation-and-curettage"{noformat}

Are you saying we want to only fire a-preop-doxycycline if the case is a single procedure of one of these options?

### Theodore Nguyen-Cao — 2026-09-14T17:29:13

Previous behavior

a-preop-doxycycline-check decided a case wanted preoperative oral doxycycline from five procedure identifiers named inside the rule, and read nothing else about the case. It fired on any case carrying one of those five, whatever else was on it, and never consulted the antibiotic configuration.

For the multiprocedure cases, we see a firings for a dilation and curettage and hysterectomy, which Mayo configures CEFAZOLIN AND METRONIDAZOLE -> CIPROFLOXACIN AND VANCOMYCIN AND METRONIDAZOLE. These should not fire.

New behavior

The alert still triggers on the same five procedures, but checks if the procedures are fully mapped and recommend None. It fires only when every other procedure on the case is configured to want no antibiotic.

||Case||Before||After||
|D&C alone|Fires|Fires|
|D&C + exam under anesthesia (both configured for no antibiotic)|Fires|Fires|
|D&C + hysterectomy (configured for cefazolin)|Fires|Silent|
|D&C + a procedure offering both a drug and no antibiotic|Fires|Silent|
|D&C + a procedure with no antibiotic configured|Fires|Silent|
|Operation with unmapped procedures|Fires|Silent|
|Oral doxycycline already given in the 4 hours before anesthesia start|Silent|Silent|

### Alexandra Wolfe — 2026-09-14T19:57:12

[~accountid:62b9bc60228c59d8da18dead] sorry, had not seen this

### Alexandra Wolfe — 2026-09-14T19:57:37

[~accountid:62b9bc60228c59d8da18dead] is this with the new skill? it’s much better, I’ll be striving for it. Do you still like the example firings?

### Theodore Nguyen-Cao — 2026-09-14T20:05:08

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] not with a skill yet but still using a diff of the ‘spec’


## Previous automated runs of this ticket

- 2026-09-17T14:14:15Z  aborted: image build failed: invalid target release 25 — loop build ran on JDK 21

Treat these as work already done. Do not repeat a settled conclusion; if a
previous run was blocked, start from that blocker rather than from scratch.
