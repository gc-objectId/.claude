import { Number, Record, Static, String } from "runtypes";

export const TrackedValue = Record({
  id: String,
  value: Number,
  type: String,
  note: String.nullable(),
  createdDate: String,
  operationCaseId: String.nullable(),
});

export type TrackedValue = Static<typeof TrackedValue>;
