# Proposed tests for OR-3185

Write exactly these.

## OR-3185#0

- **file**: `orci/src/test/java/com/guided/orci/service/InternalNotificationServiceTest.java`
- **assert**: awsProfilesKeepTheSesAlignedSender: parameterized over aws-dev, aws-stage, aws-prod, bind internal-notifications from each YAML, send via GreenMail, assert From and Return-Path are exactly noreply@guidedclinical.com and Reply-To is guidedorfeedback@guidedclinical.com; the control is the concrete From value, so adding from-address: mghguidedor@mgb.org to any AWS profile turns it red.

