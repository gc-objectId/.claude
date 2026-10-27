import {
  Record,
  Static,
  String,
  Number,
  InstanceOf,
  Optional,
  Boolean,
  Array,
} from "runtypes";
import { MedicationAdministrationID, MedicationNoteID } from "./identifiers";
import { InfusionEvent } from "./InfusionEvent";
import { DoseOption } from "./DoseOption";
import { MedicationCode } from "./MedicationCode";

export const MedicationNote = Record({
  id: MedicationNoteID,
  createdDate: String,
  lastModifiedDate: String,
  orderId: String.nullable(),
  codings: Array(MedicationCode),
  medicationName: String,
  effectiveStartDate: String.nullable(),
  effectiveEndDate: String.nullable(),
  route: String.nullable(),
  source: String.nullable(),
  status: String.nullable(),
  category: String.nullable(),
  wasNotTaken: Boolean,
  doseQuantity: String.nullable(),
  doseRate: String.nullable(),
  rawDoseTiming: String.nullable(),
  doseTimingFrequency: Number.nullable(),
  doseTimingPeriod: String.nullable(),
  doseTimingText: String.nullable(),
  asNeeded: Boolean.nullable(),
});

export type MedicationNote = Static<typeof MedicationNote>;
