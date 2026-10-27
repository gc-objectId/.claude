# OR-3023 — Disable MGB event endpoints on AWS

Status: Testing   Assignee: Ryan Ducharme

## Description

MGBNotificationController (/api/integration/mgb/event, /api/integration/mgh/event) is registered on AWS because mgb.notifications.enabled is true in application.yml and no AWS profile overrides it. MGB runs on the on-prem deployment and its tenant is disabled on AWS, so these endpoints do not apply there. They are permitAll and reachable from the internet.

Fix: set mgb.notifications.enabled to false in the AWS profiles, so the controller is not registered on AWS.

Files: orci/src/main/resources/application-aws-*.yml

## Comments (0)

(none)
