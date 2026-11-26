import {
  Record,
  Static,
  String,
  Number,
  InstanceOf,
  Optional,
  Array,
} from "runtypes";
import { MedicationAdministrationID, MedicationNoteID } from "./identifiers";
import { InfusionEvent } from "./InfusionEvent";
import { DoseOption } from "./DoseOption";

export const MedicationCode = Record({
  code: String,
  codeSystem: String,
});

export type MedicationCode = Static<typeof MedicationCode>;
