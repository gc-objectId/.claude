import { Boolean, Record, Static, String, Dictionary } from "runtypes";
import { AllergenName, AllergyID } from "./identifiers";

export const Allergy = Record({
  id: AllergyID,
  allergen: AllergenName,
  reaction: String,
  displayReaction: String,
  severity: String,
  isMedicationAllergy: Boolean,
  rxnormIdentifier: String.nullable(),
  snomedIdentifier: String.nullable(),
  medication: String.nullable(),
  reactionNotes: Dictionary(String).nullable(),
  comments: String.nullable(),
});

export type Allergy = Static<typeof Allergy>;
