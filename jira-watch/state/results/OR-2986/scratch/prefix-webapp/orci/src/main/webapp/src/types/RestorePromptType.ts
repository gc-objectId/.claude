import { Literal, Static, Union } from "runtypes";

export enum RestorePromptTypeEnum {
  FROM_CURRENT_USER = "FROM_CURRENT_USER",
  FROM_OTHER_USERS = "FROM_OTHER_USERS",
}
export const RestorePromptType = Union(
  Literal(RestorePromptTypeEnum.FROM_CURRENT_USER),
  Literal(RestorePromptTypeEnum.FROM_OTHER_USERS),
);

export type RestorePromptType = Static<typeof RestorePromptType>;
