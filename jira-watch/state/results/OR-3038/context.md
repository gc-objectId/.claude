# OR-3038 — a-insulin-glucose-check: set the glucose check interval by insulin route (IV, subcutaneous)

Status: Testing   Assignee: Ryan Ducharme

## Description

*Rules affected:* {{a-insulin-glucose-check}} (SCHEDULED / ScheduledRule / TimerContext) and {{a-insulin-glucose-check-app-launch}} (LAUNCH / AppLaunchRule / PatientContext). Type: ALERT. The app-launch rule mirrors every change below: same settings, same per-route interval, same wording.

*Problem*

One 1-hour interval applies to all insulin. Mayo checks glucose every hour after IV insulin and every 2 hours after subcutaneous insulin, so patients on subcutaneous insulin get alerts an hour early.

*Now (all sites)*

Any insulin, any route, starts a 1-hour interval. The rule fires when no glucose result exists in the past hour. It abstains when there is a result in the interval, no insulin, or the case has ended.

*After*

The interval is set by route. Bolus and infusion are not distinguished. Where both routes were given in the case, the shorter interval applies.

*Spec change*

Implement this in both specs. Where this ticket and the specs disagree, the specs are right.

{noformat}# ~ Check glucose at a set interval while a patient is on insulin
## Clinical overview
~ **A patient who has received insulin has their glucose checked within the
~ interval for the route it was given by.**
+ The interval is configurable per site, by route. The defaults are 1 hour after
+ intravenous insulin and 1 hour after subcutaneous insulin, bolus or infusion
+ alike. Where both routes were given in the case, the shorter interval applies.
## Fires when
~ The interval has passed with no glucose reading, and the patient is still on
~ insulin: an infusion is running, or insulin was given within the interval.
## Abstains when -> Requirement already met
~ A glucose reading exists from within the interval.
## Abstains when -> Out of scope
~ The patient is no longer on insulin: no infusion is running and no insulin was
~ given within the interval.
## Citations
~ - Needs a clinical reference. (intravenous)
~ - Needs a clinical reference. (subcutaneous)
## History
+ <date> · OR-3038 · The glucose check interval is set per insulin route, because
+ subcutaneous insulin needs a check every 2 hours, not every hour.{noformat}

*Unchanged by this ticket (only the interval length changes)*

* A bolus counts for one interval after it is given. An infusion counts while it runs, and for one interval after its last documented activity.
* The reminder is anchored to the earliest insulin in the case.
* Wherever the rules use 1 hour today (reminder interval, glucose lookback, recent-insulin windows), they use the interval of the routes given in the case. The reminder interval is the shortest interval among the routes given, and it shortens when a route with a shorter interval is given.
* A case with only subcutaneous insulin is checked every 2 hours at Mayo, not every hour against a 2-hour window. This replaces "scheduled job frequency is at least the shortest configured interval," which at Mayo is always 1 hour and would keep the early alert.

*Configuration*

Two settings on {{PostInsulinGlucoseCheckRuleConfig}}: intravenous interval (default 1h) and subcutaneous interval (default 1h).

Mayo: intravenous 1h, subcutaneous 2h, anything else: 1h. MGH: keep 1h for now, to be confirmed. Demo: defaults.

*Rule by rule*

||Behavior||Now||After (Mayo)||
|IV insulin|1h|1h|
|SC insulin|1h|2h|
|Both routes|1h|1h (shorter interval)|
|Infusion stopped|Counts until 1h after last activity|Counts until one interval after last activity|

*Prompt*

||Field||Value||
|Title|Check Glucose|
|Description (IV)|Patient received IV insulin at ${INSULIN_ADMINISTRATION_DATE} and has not had glucose checked in the past hour. Patients who have received IV insulin should have glucose checked at least every hour.|
|Description (SC)|Patient received subcutaneous insulin at ${INSULIN_ADMINISTRATION_DATE} and has not had glucose checked in the past 2 hours. Patients who have received subcutaneous insulin should have glucose checked at least every 2 hours.|
|Both routes given|The description for the route with the shorter interval|
|Accept / Reject|Will Check Glucose / Reject|
|Rejection reasons|Glucose check already documented ({{GLUCOSE_CHECK_ALREADY_DOCUMENTED}})|
|Allow suppression|No|

The interval in the description comes from the configured value, not fixed text.

*Scenarios (Mayo)*

||#||Sequence||Result||
|1|IV insulin at 10:00, no glucose|Fires at 11:00|
|2|SC insulin at 10:00, no glucose|Fires at 12:00, not 11:00|
|3|SC insulin at 10:00, glucose at 11:30|Silent at 12:00|
|4|IV and SC at 10:00, no glucose|Fires at 11:00|
|5|SC at 10:00, IV at 11:30, no glucose|Fires at 12:00 (interval shortens to 1h; anchor unchanged)|
|6|SC bolus at 10:00, glucose at 10:30, nothing more|Silent at 12:00; abstains after (no insulin within 2h)|
|7|App launch: case opened at 11:30 after SC at 10:00, no glucose|Silent|
|8|App launch: case opened at 12:15 after SC at 10:00, no glucose|Fires|

*Compliance backfill*

OR-3058 (#4728, changeset 235) rescored Mayo subcutaneous firings of {{a-insulin-glucose-check}} to the 2-hour window, but it ran once, before the rule changed. Firings since then are scored on 1 hour again.

* Add a new changeset (new id) with the 235 SQL, in this PR, so it runs at the same deploy as the rule change. Mayo only, like 235.
* Extend it to {{a-insulin-glucose-check-app-launch}} firings. Confirm the app-launch firing details carry the same keys ({{INSULIN_ADMINISTRATION_DATE}}, {{EVALUATION_DATE}}, {{ROUTE_QUALIFIER}}). If not, give it its own UPDATE.

*Open questions*

* Mayo citations for the intravenous and subcutaneous intervals - all will be updated for live mode, might need to use placeholder for now.
* MGH intervals. (Alex - looking into this, asked.)

*Acceptance criteria*

* Each scenario has a test, named for the row.
* With default settings, both rules behave exactly as today at every site.
* The prompt renders the exact wording per route, with the configured interval.
* After deploy, no Mayo firing of either rule is non-compliant where the insulin was subcutaneous and glucose exists within 2 hours of evaluation.
* Both spec deltas merge in the same PR as the code.

## Comments (1)

### Theodore Nguyen-Cao — 2026-10-22T15:59:36

h3. Proposed rule change (not approved)

Suggested title: a-insulin-glucose-check: set the glucose check interval by insulin route (IV, subcutaneous)

Rules: {{a-insulin-glucose-check}} (SCHEDULED / ScheduledRule / TimerContext) and {{a-insulin-glucose-check-app-launch}} (LAUNCH / AppLaunchRule / PatientContext). Type: ALERT. The app-launch rule mirrors every change below: same settings, same per-route interval, same wording.

h4. Problem

One 1-hour interval applies to all insulin. Mayo checks glucose every hour after IV insulin and every 2 hours after subcutaneous insulin, so patients on subcutaneous insulin get alerts an hour early.

h4. Spec delta (both specs)

Implement this in both specs. Where this ticket and the specs disagree, the specs are right.

{noformat}# ~ Check glucose at a set interval while a patient is on insulin
## Clinical overview
~ **A patient who has received insulin has their glucose checked within the
~ interval for the route it was given by.**
+ The interval is configurable per site, by route. The defaults are 1 hour after
+ intravenous insulin and 1 hour after subcutaneous insulin, bolus or infusion
+ alike. Where both routes were given in the case, the shorter interval applies.
## Fires when
~ The interval has passed with no glucose reading, and the patient is still on
~ insulin: an infusion is running, or insulin was given within the interval.
## Abstains when -> Requirement already met
~ A glucose reading exists from within the interval.
## Abstains when -> Out of scope
~ The patient is no longer on insulin: no infusion is running and no insulin was
~ given within the interval.
## Citations
~ - Needs a clinical reference. (intravenous)
~ - Needs a clinical reference. (subcutaneous)
## History
+ <date> · OR-3038 · The glucose check interval is set per insulin route, because
+ subcutaneous insulin needs a check every 2 hours, not every hour.{noformat}

h4. Unchanged by this ticket (only the interval length changes)

* A bolus counts for one interval after it is given. An infusion counts while it runs, and for one interval after its last documented activity.
* The reminder is anchored to the earliest insulin in the case.
* Wherever the rules use 1 hour today (reminder interval, glucose lookback, recent-insulin windows), they use the interval of the routes given in the case. The reminder interval is the shortest interval among the routes given, and it shortens when a route with a shorter interval is given.
* A case with only subcutaneous insulin is checked every 2 hours at Mayo, not every hour against a 2-hour window. (This replaces "job frequency is at least the shortest configured interval" in the description: at Mayo that is always 1h, which keeps the early alert.)

h4. Configuration

* Intravenous interval, default 1h. Subcutaneous interval, default 1h.
* Mayo: intravenous 1h, subcutaneous 2h. MGH: to be confirmed. Demo: defaults.

h4. Prompt

||Field||Value||
|Title|Check Glucose|
|Description (IV)|Patient received IV insulin at ${INSULIN_ADMINISTRATION_DATE} and has not had glucose checked in the past hour. Patients who have received IV insulin should have glucose checked at least every hour.|
|Description (SC)|Patient received subcutaneous insulin at ${INSULIN_ADMINISTRATION_DATE} and has not had glucose checked in the past 2 hours. Patients who have received subcutaneous insulin should have glucose checked at least every 2 hours.|
|Both routes given|The description for the route with the shorter interval|
|Accept / Reject|Will Check Glucose / Reject|
|Rejection reasons|Glucose check already documented|
|Allow suppression|No|

The interval in the description comes from the configured value, not fixed text.

h4. Scenarios (Mayo)

||#||Sequence||Result||
|1|IV insulin at 10:00, no glucose|Fires at 11:00|
|2|SC insulin at 10:00, no glucose|Fires at 12:00, not 11:00|
|3|SC insulin at 10:00, glucose at 11:30|Silent at 12:00|
|4|IV and SC at 10:00, no glucose|Fires at 11:00|
|5|SC at 10:00, IV at 11:30, no glucose|Fires at 12:00 (interval shortens to 1h; anchor unchanged)|
|6|SC bolus at 10:00, glucose at 10:30, nothing more|Silent at 12:00; abstains after (no insulin within 2h)|
|7|App launch: case opened at 11:30 after SC at 10:00, no glucose|Silent|
|8|App launch: case opened at 12:15 after SC at 10:00, no glucose|Fires|

h4. Compliance backfill

OR-3058 (#4728, changeset 235) rescored Mayo subcutaneous firings of a-insulin-glucose-check to the 2-hour window, but it ran once, before the rule changed. Firings since then are scored on 1 hour again.

* Add a new changeset (new id) with the 235 SQL, in this PR, so it runs at the same deploy as the rule change. Mayo only, like 235.
* Extend it to a-insulin-glucose-check-app-launch firings. Confirm the app-launch firing details carry the same keys (INSULIN_ADMINISTRATION_DATE, EVALUATION_DATE, ROUTE_QUALIFIER). If not, give it its own UPDATE.

h4. Open questions

* Mayo citations for the intravenous and subcutaneous intervals. (Alex)
* MGH intervals. (Alex)

h4. Acceptance criteria

* Each scenario has a test, named for the row
* With default settings, both rules behave exactly as today at every site
* The prompt renders the exact wording per route, with the configured interval
* After deploy, no Mayo firing of either rule is non-compliant where the insulin was subcutaneous and glucose exists within 2 hours of evaluation
* Both spec deltas merge in the same PR as the code

