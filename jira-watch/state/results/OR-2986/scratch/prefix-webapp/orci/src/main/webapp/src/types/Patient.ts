import { Boolean, Number, Record, Static, String } from "runtypes";
import { PatientID, PatientUUID } from "./identifiers";
import { Gender } from "./Gender";

export const Patient = Record({
  id: PatientUUID,
  firstName: String,
  lastName: String,
  fullName: String,
  mrn: String,
  age: Number,
  height: String,
  weight: String,
  heightInCustomaryFormat: String,
  weightInCustomaryFormat: String,
  weightValue: Number,
  weightUnits: String,
  gender: Gender,
  genderIdentity: Gender.nullable(),
  pmrn: PatientID,
  dob: String,
  epicPatientId: String.nullable(),
  birthWeight: String.nullable(),
  birthHeight: String.nullable(),
  gestationalAgeAtBirth: String.nullable(),
  postmenstrualAge: String.nullable(),
  pediatricStatus: String.nullable(),
  pregnant: Boolean,
});
export type Patient = Static<typeof Patient>;
