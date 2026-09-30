# OR-2926 — Upgrade build and runtime to Java 25 (LTS)

Status: Testing   Assignee: Ryan Ducharme

## Description

Java 25 became the LTS release in September 2025. The build targets Java 21 (OR-496). Spring Boot 4.1.1 and Hibernate 7.4 support Java 25, so there is no framework blocker.

* Set java.version to 25 in the parent pom. orci-utils/pom.xml hardcodes maven.compiler.source/target 21; make it use the property.
* Update the five setup-java steps to 25: maven-ci.yml (two), maven-cd.yml, pr-gate.yml, site-report.yml.
* The jib base image is eclipse-temurin:${java.version}-jdk-jammy, so it follows the property. Confirm the 25 tag is available for linux/arm64.
* The root Dockerfile still pins eclipse-temurin:17-jdk-jammy. Update it, or delete it if the jib images replaced it.
* Confirm Lombok 1.18.46, SpotBugs, PMD, JaCoCo, and Testcontainers all run on JDK 25.
* Confirm the MGB OpenShift environment can run a Java 25 image.

Done when CI, the full test suite, and a dev deploy all pass on Java 25.

## Comments (0)

(none)
