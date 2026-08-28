# OR-2819 — Open the debugger on a case without launching it

Status: Testing   Assignee: Ryan Ducharme

## Description

Inspecting a case currently requires launching it. Launching pulls the patient from the EMR, flips the operation's evaluation mode from SILENT to INTERACTIVE, records an InteractiveCaseLaunchEvent that feeds the launch reporting, creates an operation session, and kicks off insulin and scheduled-rule case start. Someone who only wants to look at a case should not move any of that, and today looking at a case makes it count as a clinician launch in the reporting.

Add a "View Operation" action beside "Launch" in the operations table on the admin patient page. It opens the existing in-app debugger against the operation from persisted state only.

_Scope note: the guarantee covers the launch only. The debugger tabs keep their usual edit controls, so using them still changes the case. Gating those controls was considered and deliberately left out._

h3. Delivered

* GET /api/admin/patients/{patientUuid}/operations/{operationUuid}/context returning the existing launch-context shape from persisted state, asserting the operation belongs to the patient in the path
* The read is audited as ADMIN_OPERATION with the patient and case, deliberately not APP_LAUNCH so inspections stay out of launch reporting
* New admin page at /admin/patients/:patientUuid/operations/:operationUuid/debugger
* The debugger tab set extracted out of the Ctrl+D modal so both surfaces share it, and mounted lazily per tab

h3. Also fixed

A pre-existing bug found while building this: five frontend API calls omitted the leading slash, so they resolved against the current route. That was only correct from a single-segment route like /app-launch. From the new nested route the feature-flag call reached a path returning an error document, which crashed the debugger's User tab and, separately, made the singular useFeatureFlag hook do substring matching on a string, so a flag could read as enabled while it was off.

## Comments (0)

(none)
