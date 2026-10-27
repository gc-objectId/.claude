import { Literal, Record, Static, String, Union } from "runtypes";
import { RuleID } from "./identifiers";

export const RuleConfigBehavior = Union(
  Literal("NONE"),
  Literal("NOT_CONFIGURABLE"),
  Literal("ANTIBIOTIC_REDOSE"),
  Literal("FIELD_EDITOR"),
);

export type RuleConfigBehavior = Static<typeof RuleConfigBehavior>;

export const RuleDefinition = Record({
  id: RuleID,
  description: String,
  type: String,
  trigger: String,
  configBehavior: RuleConfigBehavior,
});

export type RuleDefinition = Static<typeof RuleDefinition>;
