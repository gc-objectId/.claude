import { Dictionary, Record, Static, String } from "runtypes";

export const RuleFailureResult = Record({
  id: String,
  ruleIdentifier: String,
  error: String,
  errorMessage: String,
  exceptionClass: String,
  details: Dictionary(String, String),
});

export type RuleFailureResult = Static<typeof RuleFailureResult>;
