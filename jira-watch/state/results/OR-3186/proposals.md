# Proposed tests for OR-3186

Write exactly these.

## OR-3186#0

- **file**: `orci/src/test/java/com/guided/orci/service/InternalNotificationServiceTest.java`
- **assert**: Parameterized over aws-stage/[STAGE], aws-dev/[DEV], openshift-guidedor-tst/[TST] and openshift-guidedor-prod/(none): bind the shipped yml through Binder into InternalNotificationConfig, send 'User Barcode Mapping' via InternalNotificationService to GreenMail, assert the delivered Subject equals '<prefix> User Barcode Mapping' for the labelled profiles and exactly 'User Barcode Mapping' for prod (the prod row is the control that makes the absence provable).

