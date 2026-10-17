---
name: or3075-ehr-lookup-sentry
description: "OR-3075 EHR patient/case lookup miss → Sentry without ids — DONE 2026-10-16 (#4718 merged into the epic); EhrRecordNotResolvedException; front-door R55/R56 (R57 = OR-3074, R58/R59 = OR-3078; next free R60); MGB unknown-case NPE fixed here"
metadata:
  node_type: memory
  type: project
  originSessionId: 86ad5cda-e40f-4a46-8cc3-007f75cd5e7a
  modified: 2026-10-16T16:34:39.873Z
---

OR-3075 (Bug under the design epic, filed from a review of OR-3064's fix): `@ResponseStatus(NOT_FOUND)` on
`RecordNotFoundException` let Spring resolve Mayo/MGB get-patient misses before Sentry's resolver (order 1).

**DONE 2026-10-16:** [PR #4718](https://github.com/guidedclinical/orci/pull/4718) merged into the epic branch
(fe2a06e9d, 3 commits), ticket moved to Done, worktree + branch removed via `worktree-done` (exit 0; it handled an
epic-branch merge fine). Claude review bot flagged two real gaps, fixed in commit 3 with approved spec diffs:
typed ids on EHR tenants (Launch by ID) can't be told apart, so the R55 decision says they're reported on purpose;
Event Center start-monitoring shares the lookup, so event-center R24 references front-door R54/R56.

**Shape Ryan chose:** new unannotated `EhrRecordNotResolvedException` (client-integration-api; first named PatientMatchException) thrown by both commands when
`getR4Resources(url, Patient.class).size() != 1`; message `Unable to find patient with pmrn: no match in the EHR` /
`…: N matches in the EHR` — PMRN left out because Sentry records exception messages verbatim AND
`EventService` case-start `log.error(..., e)` ships the message to Sentry too. Answers 500, FATAL in Sentry.
"Invoking url" log in both commands demoted to debug (it carried the PMRN into Sentry breadcrumbs).
Demo keeps 404. Spec: front-door R54 scoped to demonstration tenants, R55/R56 added. Ryan-agreed allocation: R57 = OR-3074 (blocked launch alert), R58/R59 = OR-3078 (dev-banner host rule); next free **R60**.

**Test pattern worth reusing:** standalone MockMvc with
`setHandlerExceptionResolvers(new ResponseStatusExceptionResolver(), new DefaultHandlerExceptionResolver(), new SentryExceptionResolver(mockIScopes, new SpringMvcTransactionNameProvider(), 1))`
then `verify(scopes).captureEvent(captor, any(Hint.class))` — proves "reaches Sentry" without a running app.
Driving the real `MayoGetPatientCommand` inside the mocked `PatientService` made the red check honest
(unstubbed mock FhirClient returns null/empty list both before and after the fix).

**MGB unknown case (added same day at Ryan's ask):** the SOAP surgical-record lookup returning empty used to run
break-the-glass + all FHIR fetches then NPE in `AppLaunchService.getOrCreatePatientAndOperation`. Now
`MGBGetPatientInfoStrategy` throws `forUnknownCase()` ("Unable to find case: no match in the EHR") right after the
lookup; spec folded the case into R55/R56. SOAP *failures* throw, so empty really means "EHR has no record".
Mayo still launches an unknown case with an empty record (known gap: schedule-message integration).

Jira feature-spec AC write via markdown round-trips the ```diff block verbatim (checked with jira.sh `_jira_curl` +
jq on ADF codeBlock). See [[or2863-child-session-sop]], [[or3064-unknown-patient-not-found]].
