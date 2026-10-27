import { Literal, Static, Union } from "runtypes";

export enum PromptTypeEnum {
  ALERT = "ALERT",
  WARNING = "WARNING",
  INFO = "INFO",
}
export const PromptType = Union(
  Literal(PromptTypeEnum.ALERT),
  Literal(PromptTypeEnum.WARNING),
  Literal(PromptTypeEnum.INFO),
);

export type PromptType = Static<typeof PromptType>;
