import { Number, Record, Static, String } from "runtypes";
import { PatientTemplateUUID } from "./identifiers";
import { Gender } from "./Gender";
import { ValueUnit } from "./ValueUnit";

export const PatientTemplate = Record({
  id: PatientTemplateUUID.nullable(),
  templateName: String,
  height: ValueUnit(Number).nullable(),
  weight: ValueUnit(Number).nullable(),
  gender: Gender.nullable(),
  genderIdentity: Gender.nullable(),
  dob: String.nullable(),
});
export type PatientTemplate = Static<typeof PatientTemplate>;
