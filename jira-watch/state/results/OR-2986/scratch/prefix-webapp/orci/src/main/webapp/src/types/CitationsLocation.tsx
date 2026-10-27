import { Literal, Static, Union } from "runtypes";

export enum CitationsLocationEnum {
  END_OF_BANNER = "END_OF_BANNER",
  NEXT_TO_DOSE_OPTIONS = "NEXT_TO_DOSE_OPTIONS",
}
export const CitationsLocation = Union(
  Literal(CitationsLocationEnum.END_OF_BANNER),
  Literal(CitationsLocationEnum.NEXT_TO_DOSE_OPTIONS),
);

export type CitationsLocation = Static<typeof CitationsLocation>;
