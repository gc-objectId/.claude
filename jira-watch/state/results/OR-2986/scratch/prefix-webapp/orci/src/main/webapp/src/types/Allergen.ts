import { Record, Static, String } from "runtypes";
import { AllergenID } from "./identifiers";
import { AllergenType } from "./AllergenType";

export const Allergen = Record({
  id: AllergenID,
  identifier: String,
  allergen: String,
  type: AllergenType,
});

export type Allergen = Static<typeof Allergen>;
