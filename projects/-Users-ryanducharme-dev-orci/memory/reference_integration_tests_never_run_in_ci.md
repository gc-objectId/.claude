---
name: reference-integration-tests-never-run-in-ci
description: "37 *IntegrationTest classes exist but no CI job runs them; the orci module's 21 are green in 2:24 and belong in CI, the client-integration ones need VPN"
metadata:
  node_type: memory
  type: reference
  originSessionId: 8f64a84a-629e-4548-8435-e2d0830179b0
  modified: 2026-11-13T19:48:20.009Z
---

Root `pom.xml` surefire includes `**/*Test.java` and **excludes `**/*IntegrationTest.java`**. The
`integration-tests` profile flips that, and **no workflow in `.github/workflows/` passes
`-P integration-tests`**. So every `*IntegrationTest` class is written, compiled (`test-compile`
still builds them) and never executed.

Verified 2026-11-13 on `origin/main` 9287d156d:

- **`orci` module — 21 classes, 66 tests, 0 failures, `BUILD SUCCESS` in 2:24.** Self-contained
  Testcontainers. These belong in CI as-is; they pass today, so the job goes green on day one.
  `./mvnw -B -ntp -pl orci -P integration-tests -DskipAudioGeneration=true test`
- **`mgb-client-integration` (15) and `client-integration-api` (1) — cannot run in CI.** 13 of the
  15 hit live external endpoints (`stage-webapi.partners.org` FHIR, behind the MGB VPN) and
  `FDBClientIntegrationTest` hits real FDB. They are connectivity probes wearing an integration-test
  name, not hermetic tests. Exclude them from any CI job.

**Why it matters for coverage work:** a proposed test whose only home is a `*IntegrationTest` class
is inert — it would be written, maintained and never run. That is the first bar in the `write_now`
rubric in `~/.claude/jira-watch/prompts/validate.md`, and roughly 22 of the open proposals in
[[project-automation-backlog-vetting]] fail on it alone.

OR-2782#0 proposed wiring the profile in and was declined as "not test coverage … needs its own
task"; that task was never created.
