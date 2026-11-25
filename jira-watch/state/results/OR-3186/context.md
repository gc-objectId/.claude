# OR-3186 — Mark stage internal notifications with a [STAGE] subject prefix

Status: Testing   Assignee: Ryan Ducharme

## Description

Stage sends internal notifications (feedback and user barcode mapping) to guidedorfeedback@guidedclinical.com, the same mailbox as prod, with no subject prefix. A barcode mapping from stage looks the same as one from prod, so someone can act on test data as real data. Dev and TST already use [DEV] and [TST] and send to guidedor.testing@.

h3. Change

* In application-aws-stage.yml, set internal-notifications.subject-prefix to "[STAGE]".
* Add a test that every non-prod profile that sends mail sets a subject prefix.

h3. Done when

* Internal notifications from stage arrive with subjects that start with [STAGE].

## Comments (0)

(none)
