---
name: reference_mayo_hl7_test_tz_coupling
description: MayoHL7RasMedAdminProcessorIntegrationTest date-extraction tests only pass under America/Chicago — run with -Duser.timezone=America/Chicago locally
metadata: 
  node_type: memory
  type: reference
  originSessionId: bf7624f0-6736-447c-95b3-0759ba140636
  modified: 2026-07-23T18:58:32.974Z
---

`MayoHL7RasMedAdminProcessorIntegrationTest` (in `orci/src/test`) has date-extraction tests that fail on any non-Central JVM. The processor parses zoneless HL7 RXA-3 timestamps as **Central** (Mayo's zone), but the test builds its expected `Date` with `ZoneId.systemDefault()` — so `…extractsAllCriticalFields` and `completionStatusCanceled_triggersDeleteOnMatchingAdmin` only agree when the JVM runs in `America/Chicago`. On a machine in Eastern they fail with a flat 1-hour offset (e.g. expected 08:43 vs actual 09:43). The pom pins no `user.timezone` (empty `argLine`), so CI must run Central.

**Run these locally with:** `mvn -pl orci test -Dtest=MayoHL7RasMedAdminProcessorIntegrationTest -Duser.timezone=America/Chicago`

The OR-2621 medication-mapping-tracking tests in the same file are deliberately TZ-agnostic (windows chosen to clear the Central-vs-local offset) and pass in any zone. Follow-up worth doing: pin `-Duser.timezone` in surefire so the date-extraction tests aren't environment-coupled. Verified 2026-07-23 during OR-2621 validation. Related: [[project_mayo_integration_testing]], [[feedback_validate_against_main]].
