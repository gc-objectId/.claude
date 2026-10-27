import { Boolean, Record, Static, String } from "runtypes";

export const RejectionReasonOption = Record({
  rejectionReason: String,
  reason: String,
  customInput: Boolean,
  customInputLabel: String.nullable(),
});

export type RejectionReasonOption = Static<typeof RejectionReasonOption>;
