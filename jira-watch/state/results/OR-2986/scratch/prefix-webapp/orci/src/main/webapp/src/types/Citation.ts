import { Record, Static, String } from "runtypes";

export const Citation = Record({
  id: String,
  label: String,
  url: String,
  citation: String.nullable(),
  ruleId: String.optional(),
});

export type Citation = Static<typeof Citation>;
