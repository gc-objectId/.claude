import { Array, Record, Static, String } from "runtypes";
import { Condition } from "./Condition";

export const ConditionProfile = Record({
  cardiacRiskConditions: Array(String),
  conditions: Array(Condition),
});
export type ConditionProfile = Static<typeof ConditionProfile>;
