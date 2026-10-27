import { Literal, Static, Union } from "runtypes";

export const OperationStatusEnum = {
  IN_PROGRESS: "IN-PROGRESS",
  COMPLETED: "COMPLETED",
  ENDING: "ENDING",
};
export const OperationStatus = Union(
  Literal(OperationStatusEnum.IN_PROGRESS),
  Literal(OperationStatusEnum.COMPLETED),
  Literal(OperationStatusEnum.ENDING),
);
export type OperationStatus = Static<typeof OperationStatus>;
