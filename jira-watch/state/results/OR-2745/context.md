# OR-2745 — Honor Observation.status and keep text lab results intact (Mayo)

Status: Testing   Assignee: Ryan Ducharme

## Description

Mayo FHIR lab ingestion accepts observations that Epic has marked as carrying no result, and mangles narrative results while trying to split a unit off them. Both were found while investigating OR-2743.

h3. Status is ignored

Observation.status was never read or persisted for Mayo labs. MayoGetLaboratoryValuesR4Command never calls getStatus(), and MayoGetLatestObservationsR4Command only enforces it for QTC_INTERVAL, since validStatuses defaults to empty and empty means accept anything. So cancelled and entered-in-error results reach the rules as if final. Mayo prod shows the consequence: a potassium row valued CANCELED, and PTT rows that satisfy the "a PTT exists" check in a-heparin-without-ptt without being results.

h3. Narrative results are split into a fake unit

FhirUtils.getValueAndUnit split any whitespace-containing valueString into token[0] as the value and token[1] as the unit. Epic sends narrative results as strings, so "SEE COMMENT" became value SEE with units COMMENT, and a multi-paragraph interpretation became value "This" with units "test", discarding the rest. Real multi-word units such as "mm Hg" were truncated to "mm" by the same code.

h3. Scope

* Reject cancelled and entered-in-error in both Mayo observation commands. Every other status, including preliminary, still reaches the rules: Epic marks auto-verified stat labs preliminary, and those are what a clinician acts on during a case.
* Log the per-fetch status mix, since status is not persisted and this is the only way to learn which of the eight R4 codes Mayo sends before narrowing further.
* Split a valueString into value and unit only when the leading token parses as a number, and treat the remainder as the unit so multi-word units survive. Anything else is the result itself and is kept whole with no unit.
* Add CORRECTED to the Mayo QTc status allowlist. A corrected result replaces a reviewed one and was being discarded.

h3. Not in scope

* Reading comparator bounds such as >90 and <15, which is OR-2744.
* MGB, which has the same status gap across 9 of its 10 observation commands plus the same missing CORRECTED in MGBGetQTCIntervalR4Command.
* Re-classifying the rows already stored. Status was never persisted, so existing rows cannot be re-judged without re-fetching from Epic.

## Comments (1)

### Automation for Jira — 2026-08-14T20:43:12

The linked issue - OR-2743 has been resolved

