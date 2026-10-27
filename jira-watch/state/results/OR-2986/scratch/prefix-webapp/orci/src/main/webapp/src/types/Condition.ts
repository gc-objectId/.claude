import { Record, Static, String, Array, InstanceOf } from "runtypes";
import { ConditionID, ConditionUUID } from "./identifiers";

export const ConditionDTO = Record({
  uuid: ConditionUUID,
  conditionId: ConditionID,
  tags: Array(String),
  onsetDate: String.nullable(),
});

export type ConditionDTO = Static<typeof ConditionDTO>;

export const Condition = Record({
  uuid: ConditionUUID,
  conditionId: ConditionID,
  tags: Array(String),
  onsetDate: String.nullable(),
});

export type Condition = Static<typeof Condition>;
