import { Dictionary, Record, Static, String } from "runtypes";

export const RuleNotFiredResult = Record({
  id: String,
  ruleIdentifier: String,
  explanation: String,
  details: Dictionary(String, String),
});

export type RuleNotFiredResult = Static<typeof RuleNotFiredResult>;
