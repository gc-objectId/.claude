---
name: reference-integration-test-naming-excludes-from-ci
description: "Surefire excludes on the *name* *IntegrationTest, not the kind of test: 22 of 37 integration-grade classes run in CI today, 15 are excluded by naming alone"
metadata:
  node_type: memory
  type: reference
---

Root `pom.xml` surefire includes `**/*Test.java` and **excludes `**/*IntegrationTest.java`**. No
workflow in `.github/workflows/` passes `-P integration-tests`. The exclusion is on the **file name**,
not on what the test does.

Verified 2026-11-17 on `main`, counting classes extending `AbstractIntegrationTest` /
`AbstractCommittingIntegrationTest`:

- **22 run in CI on every build** — named `*Test` or `*SpecTest`. Real Testcontainers, real Postgres,
  real `afterCommit` ordering. `MrsaAdjustedResolutionSpecTest`, `ObservationServiceTest`,
  `DefaultHL7ProcessingContextObservationDispatchTest`, `ProcedureCombinationResolutionTest` and
  friends are integration tests that happen to be named conventionally.
- **15 are excluded** — named `*IntegrationTest`. Same base classes, same kind of test, invisible to
  every build. `DefaultHL7ProcessingContextSaveObservationsIntegrationTest` sits in the same package
  as a running sibling.

**So "needs a real DB" is never a reason to defer a test.** Name the class `*Test`, extend the
integration base, and it runs today. A test is only unrunnable if it is proposed *into an existing*
`*IntegrationTest` class — and the fix there is to rehome it, not to decline it.

**Correction:** an earlier pass concluded all 37 were inert and that wiring `-P integration-tests`
into CI was the high-value fix. That overstated it. Renaming the 15 folds them into the existing job
with no new workflow, no second build, and no extra CI minutes — and avoids the "not test coverage"
objection that killed OR-2782#0.

The `mgb-client-integration` (15) and `client-integration-api` (1) modules are a separate matter:
they hit live external endpoints (`stage-webapi.partners.org` FHIR behind the MGB VPN, real FDB) and
are connectivity probes, not hermetic tests. Exclude them from any CI job regardless of naming.

See [[project-automation-backlog-vetting]].
