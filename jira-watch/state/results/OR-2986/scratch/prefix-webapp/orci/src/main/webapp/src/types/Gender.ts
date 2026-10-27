import { Literal, Static, Union } from "runtypes";

export const GenderOptions = [
  "MALE",
  "FEMALE",
  "TRANSGENDER_FEMALE",
  "TRANSGENDER_MALE",
  "NON_DISCLOSE",
  "NON_BINARY",
  "OTHER",
  "UNKNOWN",
] as const;
export const Gender = Union(
  Literal("MALE"),
  Literal("FEMALE"),
  Literal("TRANSGENDER_FEMALE"),
  Literal("TRANSGENDER_MALE"),
  Literal("NON_DISCLOSE"),
  Literal("NON_BINARY"),
  Literal("OTHER"),
  Literal("UNKNOWN"),
);
export type Gender = Static<typeof Gender>;
