import { Record, Static, Array } from "runtypes";
import { Allergy } from "./Allergy";

export const PatientAllergies = Record({
  allergy: Allergy,
  medicationAllergies: Array(Allergy),
});

export type PatientAllergies = Static<typeof PatientAllergies>;
