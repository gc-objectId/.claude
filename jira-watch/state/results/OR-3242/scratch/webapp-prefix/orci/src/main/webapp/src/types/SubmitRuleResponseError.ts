import { Record, Static, String } from "runtypes";

export const SubmitRuleResponseError = Record({
  error: Record({
    customInputValueError: String,
  }),
});

export type SubmitRuleResponseError = Static<typeof SubmitRuleResponseError>;
