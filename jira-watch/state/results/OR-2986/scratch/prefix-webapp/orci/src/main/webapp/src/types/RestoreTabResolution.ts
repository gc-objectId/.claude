import { Literal, Static, Union } from "runtypes";
export const RestoreTabResolutionEnum = {
  RESTORED: "RESTORED",
  IGNORED: "IGNORED",
  USER_CANCELLED: "USER_CANCELLED",
  GUIDANCE_CANCELLED: "GUIDANCE_CANCELLED",
};
export const RestoreTabResolution = Union(
  Literal(RestoreTabResolutionEnum.RESTORED),
  Literal(RestoreTabResolutionEnum.IGNORED),
  Literal(RestoreTabResolutionEnum.USER_CANCELLED),
  Literal(RestoreTabResolutionEnum.GUIDANCE_CANCELLED),
);
export type RestoreTabResolution = Static<typeof RestoreTabResolution>;
