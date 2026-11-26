import { Literal, Static, Union } from "runtypes";

export const RuleTrigger = Union(
  Literal("LAUNCH"),
  Literal("SELECTION"),
  Literal("DOSE"),
  Literal("CONTINUOUS"),
  Literal("SCHEDULED"),
  Literal("NOTIFICATION"),
);

export type RuleTrigger = Static<typeof RuleTrigger>;
