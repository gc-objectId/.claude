import { Number, Record, Static, String, Array } from "runtypes";
import { Concentration } from "./Concentration";

export const MedicationDosingDTO = Record({
  medicationIdentifier: String,
  adminMonth: Number,
  adminDay: Number,
  adminYear: Number,
  adminHours: Number,
  adminMinutes: Number,
  doseUnits: String,
  doseAmount: Number,
  ndc: String.nullable(),
  concentrations: Array(Concentration),
  route: String.nullable(),
});
export type MedicationDosingDTO = Static<typeof MedicationDosingDTO>;
