# OR-2948 — New rule: a-incomplete-antibiotic-pathway

Status: Testing   Assignee: Ryan Ducharme

## Description

h3. Stale pre-op antibiotic: guidance for every antibiotic state

*Spec:* {{a-incomplete-antibiotic-pathway}} 
*Reference (internal reference, not citation):* [https://claude.ai/artifact/7iS1oUbxVPHKsAziPcXp5f|https://claude.ai/artifact/7iS1oUbxVPHKsAziPcXp5f|smart-link] 

h4. Acceptance criteria

*Definitions*

* _Perioperative_ means the 4h before case start.
* _Lookback_ is 1h, or 2h for no-redose antibiotics.
* _Candidates_ are the antibiotics in the procedure's pathway, in pathway order.

*States.* Assign one state to each candidate.

||State||Dose||
|GIVEN|in [lookback, incision]|
|ABSENT|none in [4h, incision]|
|EARLY_REDOSE|in [4h, lookback] only; redose antibiotic|
|EARLY_NOREDOSE|in [4h, lookback] only; no-redose antibiotic|
|EARLY_DISCRETION|in [4h, lookback] only; discretion antibiotic|

*Variables*

||Variable||Value||
|{procedure}|procedure name|
|{antibiotic}|the candidate being rendered|
|{time}|administration time of that candidate's dose, HH:MM|
|{pathway}|all candidates, as a list|
|{given}|GIVEN candidates, as a list|

Lists are written "A", "A and B", or "A, B, and C". Antibiotic names are lowercase in body text. In titles, and at the start of a line, their first letter is capitalized.

*Title templates*

||ID||Template||
|TITLE_ABSENT|Administer {antibiotic}|
|TITLE_REDOSE|Redose {antibiotic}|
|TITLE_EVALUATE|Evaluate {antibiotic} Status|

*Body templates*

||ID||Template||
|FIRST_TEXT|Prior to incision for {procedure}, recommend {pathway}.|
|NONE_GIVEN|Patient received no perioperative antibiotics.|
|ABSENT|{antibiotic} not yet administered.|
|ABSENT_WITH_GIVEN|Patient received {given}. {antibiotic} not yet administered.|
|EARLY_REDOSE|{antibiotic} administered at {time} (> {lookback period} before incision). Recommend repeating the full dose.|
|EARLY_NOREDOSE|{antibiotic} administered at {time} (> {lookback period} before incision). No redose suggested due to potential toxicity. Consult with pharmacy.|
|EARLY_DISCRETION|{antibiotic} administered at {time} (> {lookback period} before incision). Consult with pharmacy regarding redosing.|

*State → template*

||State||Title||Body||
|GIVEN|—|—|
|ABSENT|TITLE_ABSENT|ABSENT, or ABSENT_WITH_GIVEN (see assembly)|
|EARLY_REDOSE|TITLE_REDOSE|EARLY_REDOSE|
|EARLY_NOREDOSE|TITLE_EVALUATE|EARLY_NOREDOSE|
|EARLY_DISCRETION|TITLE_EVALUATE|EARLY_DISCRETION|

*Assembly*

# If every candidate is GIVEN, the alert is silent.
# Otherwise the alert fires. Order the non-GIVEN candidates by state: ABSENT, EARLY_REDOSE, EARLY_NOREDOSE, EARLY_DISCRETION. Within a state, keep pathway order.
# *Title:* one title template per candidate in that order, joined with "; ".
# *Body:*
#* If every candidate is ABSENT, the body is one line: FIRST_TEXT + " " + NONE_GIVEN.
#* Otherwise, print FIRST_TEXT, then one line per candidate in that order.
#* The first ABSENT candidate uses ABSENT_WITH_GIVEN if any candidate is GIVEN. Every other ABSENT candidate uses ABSENT.

h4. Examples

Incision is at 09:00 in each case.

*Hysterectomy.* Candidates are cefazolin and metronidazole. Cefazolin was given at 07:30. No metronidazole.

{quote}*Administer Metronidazole; Redose Cefazolin*
Prior to incision for hysterectomy, recommend cefazolin and metronidazole.
Metronidazole not yet administered.
Cefazolin administered at 07:30 (> 1 hour before incision). Recommend repeating the full dose.{quote}

*Knee arthroscopy.* The only candidate is cefazolin, given at 07:45.

{quote}*Redose Cefazolin*
Prior to incision for knee arthroscopy, recommend cefazolin.
Cefazolin administered at 07:45 (> 1 hour before incision). Recommend repeating the full dose.{quote}

*Knee arthroscopy.* The only candidate is cefazolin. Nothing was given.

{quote}*Administer Cefazolin*
Prior to incision for knee arthroscopy, recommend cefazolin. Patient received no perioperative antibiotics.{quote}

*Appendectomy.* Candidates are vancomycin, ciprofloxacin and metronidazole. Vancomycin was given at 06:30 and ciprofloxacin at 08:30. No metronidazole.

{quote}*Administer Metronidazole; Evaluate Vancomycin Status*
Prior to incision for appendectomy, recommend vancomycin, ciprofloxacin, and metronidazole.
Patient received ciprofloxacin. Metronidazole not yet administered.
Vancomycin administered at 06:30 (> 2 hours before incision). No redose suggested due to potential toxicity. Consult with pharmacy.{quote}

*Appendectomy.* Candidates are vancomycin, ciprofloxacin and metronidazole. Vancomycin was given at 08:15. No ciprofloxacin or metronidazole.

{quote}*Administer Ciprofloxacin; Administer Metronidazole*
Prior to incision for appendectomy, recommend vancomycin, ciprofloxacin, and metronidazole.
Patient received vancomycin. Ciprofloxacin not yet administered.
Metronidazole not yet administered.{quote}

*Appendectomy.* Candidates are cefazolin and metronidazole. Nothing was given.

{quote}*Administer Cefazolin; Administer Metronidazole*
Prior to incision for appendectomy, recommend cefazolin and metronidazole. Patient received no perioperative antibiotics.{quote}

## Comments (25)

### Alexandra Wolfe — 2026-09-24T12:17:37

Note for product: add column to antibiotic lookback file with Given early, redose; Given early, no-redose; Given early, discretion.

### Theodore Nguyen-Cao — 2026-09-30T14:19:51

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] the text shows “before incision” but we technically use case start. the text doesn’t have to align but I want to call that out. we decided to use case start because we give even more of a larger grace period.

### Theodore Nguyen-Cao — 2026-09-30T15:11:46

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] is early redose vs early non-redose hardcoded to use 1 hour vs 2 hours? or do we need to look at lookback configuration?

### Alexandra Wolfe — 2026-09-30T18:49:26

[~accountid:62b9bc60228c59d8da18dead] I am okay with this - I think I got this before incision from claude, but perhaps I phrased something wrong and confused it.

### Alexandra Wolfe — 2026-09-30T18:49:54

[~accountid:62b9bc60228c59d8da18dead] use lookback for values, hardcode for text

### Theodore Nguyen-Cao — 2026-09-30T18:51:24

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] if we do that and they don’t align, you will get the early redose fire after this rule fires in some cases because lookback periods don’t align with the 1 / 2 hour periods

### Theodore Nguyen-Cao — 2026-09-30T18:51:39

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] so we should say case start or incision?

### Alexandra Wolfe — 2026-09-30T18:53:03

[~accountid:62b9bc60228c59d8da18dead] the text should keep incision

### Automation for Jira — 2026-10-05T17:11:40

The linked issue - OR-2944 has been resolved

### Jordan Ephron — 2026-10-15T04:56:36

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] We had formatting for candidates that apply to specific acuities for when the current case doesn't have a known acuity, but this is not specified in the ticket. What do we want done when, for example, we have a case {{p-cesarean-delivery}} without a known acuity, but all pathways specify one of ‘elective’, ‘urgent’, or ‘emergent’?

### Jordan Ephron — 2026-10-15T04:57:42

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] What do we want to do if there are multiple parallel pathways / options? Should we display all of them separated by OR?

### Alexandra Wolfe — 2026-10-20T18:28:05

[~accountid:62b9bc60228c59d8da18dead] What do you mean they don’t align?

### Theodore Nguyen-Cao — 2026-10-20T18:32:52

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] if you configure a med’s look back to be 1 hr but it’s an early non-redose is hard coded to be 2 hours, you are going to get 1 hour to be used but 2 hours to be displayed.

### Theodore Nguyen-Cao — 2026-10-20T18:36:27

I’m basically calling out 

{{{antibiotic} administered at {time} (> 1 hour before incision). Recommend repeating the full dose.}}

should actually be

{{{antibiotic} administered at {time} (> {lookback period} hour before incision). Recommend repeating the full dose.}}

and not hard coded to be 1 and 2.

### Alexandra Wolfe — 2026-10-20T18:43:25

[~accountid:640bbd89896d10ebd4754d07] I’d say we write all the recommendations if it’s not clear which is (for emergent [p-map], recommend…)

### Alexandra Wolfe — 2026-10-20T18:43:50

[~accountid:62b9bc60228c59d8da18dead] We can do that and I can update, it was meant to simplify at the time.

### Alexandra Wolfe — 2026-10-20T18:45:35

[~accountid:640bbd89896d10ebd4754d07] What do you mean separated by OR?

### Jordan Ephron — 2026-10-20T18:55:49

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] the literal word ‘or’, like “a OR b” 

### Alexandra Wolfe — 2026-10-20T19:03:45

[~accountid:640bbd89896d10ebd4754d07] oh, I was reading it as OR (operating room) :sweat_smile: . I think that works.

### Theodore Nguyen-Cao — 2026-10-23T15:14:06

[~accountid:640bbd89896d10ebd4754d07] I think NONE_GIVEN is the odd one out. you could have 2 pathways and a partially given pathway and nothing given for the 2nd pathway. “Patient received no perioperative antibiotics.” doesn’t make sense in this case because we did give some antibiotics. We probably should only display this if NONE_GIVEN is true for all pathways.

### Jordan Ephron — 2026-10-27T18:42:51

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] Last piece I need from you is the “Redose Category” column filled out for all of the antibiotic lookback periods. The allowed values are “REDOSE”, “NO_REDOSE”, and “DISCRETION”, with the default being “DISCRETION”.
That column is currently only present on my branch. Let me know if you want to go through it together.

### Alexandra Wolfe — 2026-10-29T16:15:18

[~accountid:640bbd89896d10ebd4754d07] Sure- we can look at this Monday after team meeting?

### Alexandra Wolfe — 2026-11-04T18:50:48

[~accountid:640bbd89896d10ebd4754d07] this is done

### Theodore Nguyen-Cao — 2026-11-04T20:24:43

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] where is this? did you patch the existing PR ?

### Alexandra Wolfe — 2026-11-04T20:32:08

[~accountid:62b9bc60228c59d8da18dead] it appears I had not published it, should be here now: [https://github.com/guidedclinical/orci/pull/4814|https://github.com/guidedclinical/orci/pull/4814]

