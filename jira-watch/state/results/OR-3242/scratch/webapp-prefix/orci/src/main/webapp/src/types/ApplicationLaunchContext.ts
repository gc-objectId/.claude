import { Array, Boolean, String, Record, Static } from "runtypes";
import { Patient } from "./Patient";
import { AlertDefinition } from "./AlertDefinition";
import { Operation } from "./Operation";
import { ConditionProfile } from "./ConditionProfile";

export const IntegrationFailure = Record({
  label: String,
  errorMessage: String.nullable(),
});

export type IntegrationFailure = Static<typeof IntegrationFailure>;

export const LaunchBlockedDTO = Record({
  title: String,
  explanation: String,
});

export type LaunchBlockedDTO = Static<typeof LaunchBlockedDTO>;

export const ApplicationLaunchContext = Record({
  launchBlocked: Boolean,
  launchBlockedReason: LaunchBlockedDTO.optional().nullable(),
  patient: Patient,
  operation: Operation,
  conditionProfile: ConditionProfile,
  alerts: Array(AlertDefinition).nullable(),
  hasPreviouslyUnresolvedTabs: Boolean,
  integrationFailures: Array(IntegrationFailure),
  integrationFailureMessage: String.nullable(),
  allowVitalSignOptIn: Boolean,
  // null means we don't know, true means run vital sign rules, false means don't run vital sign rules
  vitalSignRulesOptIn: Boolean.nullable(),
});

export type ApplicationLaunchContext = Static<typeof ApplicationLaunchContext>;
