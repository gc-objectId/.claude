import { Literal, Static, Union } from "runtypes";

export enum AllergenTypeEnum {
  ALLERGEN = "ALLERGEN",
  MEDICATION = "MEDICATION",
}

export const AllergenType = Union(
  Literal(AllergenTypeEnum.ALLERGEN),
  Literal(AllergenTypeEnum.MEDICATION),
);

export type AllergenType = Static<typeof AllergenType>;
