import {
  Array,
  Boolean,
  Literal,
  Record,
  Static,
  String,
  Union,
} from "runtypes";
import { AlertDefinition } from "./AlertDefinition";
import { Patient } from "./Patient";
import { Operation } from "./Operation";

export enum GuidanceNotificationTypeEnum {
  ALERT = "ALERT",
  OPERATION_COMPLETED = "OPERATION_COMPLETED",
  OPERATION_ENDING = "OPERATION_ENDING",
  MEDICATION_SCAN_REMINDER = "MEDICATION_SCAN_REMINDER",
  OPERATION_UPDATED = "OPERATION_UPDATED",
}

export const GuidanceNotificationType = Union(
  Literal(GuidanceNotificationTypeEnum.ALERT),
  Literal(GuidanceNotificationTypeEnum.OPERATION_COMPLETED),
  Literal(GuidanceNotificationTypeEnum.OPERATION_ENDING),
  Literal(GuidanceNotificationTypeEnum.MEDICATION_SCAN_REMINDER),
  Literal(GuidanceNotificationTypeEnum.OPERATION_UPDATED),
);
export type GuidanceNotificationType = Static<typeof GuidanceNotificationType>;

export const GuidanceNotificationPayload = Record({
  id: String,
  patient: Patient,
  operation: Operation,
  alerts: Array(AlertDefinition),
  notifyPerRule: Boolean,
  tabName: String.nullable(),
});
export type GuidanceNotificationPayload = Static<
  typeof GuidanceNotificationPayload
>;

export const GuidanceNotification = Union(
  Record({
    type: GuidanceNotificationType,
    payload: GuidanceNotificationPayload,
  }),
  Record({
    type: Literal(GuidanceNotificationTypeEnum.MEDICATION_SCAN_REMINDER),
    // no additional information for this event
  }),
);
export type GuidanceNotification = Static<typeof GuidanceNotification>;
