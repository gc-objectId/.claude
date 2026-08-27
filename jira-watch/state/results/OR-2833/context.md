# OR-2833 — Delete the unused case-launcher module

Status: Testing   Assignee: Ryan Ducharme

## Description

case-launcher was built to address performance problems with case launching for MGB. That no longer appears to be a concern, and the module is deployed to no environment, so we are deleting the project for now.

If we need it again, revert the commit and build from there. The case launch process has moved on since the module was written, so a revert will need to be re-aligned with how launching works now.

h3. Delivered

* Delete the case-launcher module (21 files, including a vendored 11 MB elastic-apm-agent jar)
* Remove the case-launcher profile from the root pom
* Remove the case-launcher.enabled flag from orci config and the AppLaunchController branch it guarded, which only threw UnsupportedOperationException
* Drop the now-constant case_launcher tag from the orci.case.launch counter
* Remove the -Pcase-launcher build note from CLAUDE.md

h3. Follow-ups (not in this PR)

* The case-launcher ECR repository in 926418967601 / us-east-2 is now orphaned: 200+ untagged images, roughly 79 GB, last push 2026-05-07. Nothing will push or pull it again.
* Separate pre-existing bug found while reviewing the metric change: the AWS configs use management.metrics.export.cloudwatch.*, the Spring Boot 2 property path, which binds nothing under Spring Boot 4.1.0. Every custom orci.* metric is silently unexported on dev, stage, and prod. Worth its own ticket.

PR: [https://github.com/guidedclinical/orci/pull/4471|https://github.com/guidedclinical/orci/pull/4471]

## Comments (1)

### Automation for Jira — 2026-08-26T19:05:40

The linked issue - OR-2779 has been resolved

