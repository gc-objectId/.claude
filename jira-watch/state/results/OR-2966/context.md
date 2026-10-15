# OR-2966 — Make SpotBugs and PMD gate the build

Status: Testing   Assignee: Ryan Ducharme

## Description

SpotBugs and PMD are defined only in pluginManagement in the root pom and appear under <reporting> in the module poms, so mvn verify never runs them. The CI security-audit job runs spotbugs:spotbugs, a report goal that cannot fail, and uploads an artifact.

Bind spotbugs:check and pmd:check to verify in the parent build. SpotBugs gates at High, and at Medium for the SECURITY category (policy in spotbugs-exclude.xml; CRLF_INJECTION_LOGS stays excluded). Baseline the current findings so only new findings fail: spotbugs-baseline.xml and pmd-baseline.properties at the repo root. Run the checks in the parallel CI job (renamed static-analysis), and skip them in the gating build job and the other Maven workflows. Move the copy-pasted <reporting> blocks into the root pom. The deploy tool runs ./mvnw, because spotbugs-maven-plugin needs Maven 3.8.9 or later. Backlog cleanup: OR-3018 (SpotBugs), OR-3019 (PMD).

JaCoCo is out of scope. A line-coverage floor shows that code ran, not that a test asserted anything, and the agent costs about 23% of test CPU time on the gating job. The opt-in coverage profile stays for local use.

## Comments (0)

(none)
