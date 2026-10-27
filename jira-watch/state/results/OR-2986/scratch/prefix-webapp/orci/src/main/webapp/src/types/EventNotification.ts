import { Record, Static, String } from "runtypes";

export const EventNotification = Record({
  id: String,
  displayName: String,
  eventType: String,
  body: String,
  startTime: String,
  endTime: String.nullable(),
  caseId: String.withBrand("CaseId").optional(),
});

export type EventNotification = Static<typeof EventNotification>;
