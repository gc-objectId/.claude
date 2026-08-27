# OR-2766 — Post-insulin glucose check reminders are scheduled onto already-closed cases

Status: Testing   Assignee: Ryan Ducharme

## Description

ScheduledRuleEngine.schedulePostInsulinGlucoseCheck gates on the wrong timestamp. It resolves findEarliestInsulinAdministration(patient, operation) and then tests that administration against the case window:

{code:java}if (operation.getStartTime() == null
    || earliest.administrationTime().isBefore(operation.getStartTime().toInstant())
    || (operation.getEndTime() != null && earliest.administrationTime().isAfter(operation.getEndTime().toInstant()))) {
    return;
}{code}

It asks "was the earliest insulin dose intraop?" and never "is this case still open?". Once a patient has had one intraop dose the check passes forever, so an insulin RAS message arriving after the case closed schedules a fresh repeatForever hourly job on a closed case.

Nothing downstream catches it. CANCEL_POST_INSULIN_GLUCOSE_CHECK_REMINDERS rides only PROCEDURE_FINISH, which has already passed. ScheduledRuleEngine.handleCaseStop, the CLOSE_APP path that stamps end_time, cancels only NoInsulinGlucoseCheckJob. Its comment claims the rule's own abstain on operation.endTime is a backstop, but that abstain exists only on the no-insulin rule; PostInsulinGlucoseCheckScheduledRule.evaluate never reads endTime. There is no backstop.

This is the follow-up OR-2732 anticipated: "a fire-time guard so a reminder validates the case is still open before alerting".

h3. Evidence (mayo-mayo prod, 0.1.88, 24h to 2026-08-11 05:00 UTC)

* Insulin messages arrive long after the dose. Lag from administration to the scheduling log line, 74 occurrences: median 290.8 min (4.8h), p90 656 min, max 868 min. 50 of 74 over an hour.
* Jobs are created on closed cases. job_metadata joined to operations: PostInsulinGlucoseCheckJob 4 of 27 rows created after end_time, median 18.2 min after, max 43.1 min. Both AntibioticRedoseReminder job classes: 0 of 340, because they are scheduleOneTimeJob and cannot accumulate.
* This is not a NULL end_time window. Those 4 jobs were created with end_time already populated; the guard passed anyway.
* The cancel loses the race: 74 schedule log lines against 19 occurrences of "Cancelled N post-insulin glucose check reminders".
* Resulting firings: a-insulin-glucose-check lands after end_time 61 times, median 556 min (9.3h) past case close, max 2126 min (35.4h). Zero of 61 within 5 minutes, so this is not the clinical-clock vs ingestion-clock artifact affecting a-nmb-reversal-extubation (median 0.7 min).
* Mayo-specific. MGB runs the same code: a-insulin-glucose-check is 0 of 101 firings post-end since 2026-06-01. The leak requires the RAS documentation lag, which is a property of Mayo's feed.

h3. Impact

Contained, not urgent. The analytics end_time clip discards all 61 firings, so the error rate is unaffected, and the trigger is CONTINUOUS so PR 4300's NOTIFICATION carve-out will not expose them. Mayo runs silent mode, so no clinician sees them. The costs are wasted work (~61 firings/day, each an observation lookup, a rule evaluation and two row writes) and a latent reporting hazard: remove the clip or report off raw firings and these become 61 phantom non-compliant alerts per day on closed cases.

repeatForever is not the defect. JobCleanerJob runs hourly per tenant with STALE_JOB_HOUR_THRESHOLD = 36 and QuartzJobService.getStaleJobKeys reaps by trigger age, so each leaked job is bounded at roughly 36 firings. The observed 35.4h maximum against that 36h threshold is the cleaner working as designed.

h3. Fix

# Refuse to schedule when operation.getEndTime() != null. The case is over.
# Give PostInsulinGlucoseCheckScheduledRule.evaluate an endTime abstain, making handleCaseStop's comment true.
# Cancel PostInsulinGlucoseCheckJob.JOB_GROUP in ScheduledRuleEngine.handleCaseStop alongside the no-insulin job, since that is where reminders are already cancelled at case stop.

Items 1 and 2 are independent; either stops the leak. Leave repeatForever alone.

## Comments (3)

### Theodore Nguyen-Cao — 2026-08-13T22:09:13

[~accountid:712020:d2274773-c7f0-4211-8972-3ecf31d0eb5c] I need confirmation on whether this is a bug.

The insulin glucose check reminder is cancelled at procedure end, not at anesthesia stop or out-of-room. Any check already scheduled stops there.

After that cancellation, any further insulin message on the case re-creates the reminder. That includes an infusion rate change or a correction to a dose given earlier in the case, not just a new dose. When it is re-created it does not wait an hour: the reminder is anchored to the first insulin of the case, so that time has usually passed and it alerts within seconds. 

Two options:

# The reminder stays cancelled once the procedure ends, even if more insulin is given or documented. 

# Glucose checks continue until the patient leaves the room, so we move the cancellation from procedure end to case close.

 

### Alexandra Wolfe — 2026-08-14T12:09:34

[~accountid:62b9bc60228c59d8da18dead] I would go for 2: move the cancellation from procedure end to case close.

### Automation for Jira — 2026-08-14T19:43:38

The linked issue - OR-2732 has been resolved

