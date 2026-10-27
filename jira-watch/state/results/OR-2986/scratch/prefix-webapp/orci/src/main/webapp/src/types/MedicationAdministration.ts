import {
  Array,
  Literal,
  Number,
  Record,
  Static,
  String,
  Union,
} from "runtypes";
import { MedicationAdministrationID } from "./identifiers";
import { InfusionEvent } from "./InfusionEvent";
import { ColorLabelSetting } from "./ColorLabelSetting";
import { Concentration } from "./Concentration";

export const MedicationAdministration = Record({
  id: MedicationAdministrationID,
  createdDate: String,
  lastModifiedDate: String,
  orderId: String.nullable(),
  type: Union(Literal("BOLUS"), Literal("INFUSION")),
  medicationIdentifier: String.nullable(),
  medicationName: String,
  ndc: String.nullable(),
  administrationDate: String.nullable(),
  doseUnits: String.nullable(),
  concentrations: Array(Concentration),
  doseAmount: Number.nullable(),
  route: String.nullable(),
  sourceType: String.nullable(),
  infusionEvents: Array(InfusionEvent).nullable(),
});

export type MedicationAdministration = Static<typeof MedicationAdministration>;

export const RecentMedicationAdministration = Record({
  id: String,
  selectionMedId: String.nullable(),
  selectionBarcode: String.nullable(),
  colorLabelSetting: ColorLabelSetting.nullable(),
  shortName: String,
  administrationDate: String,
  route: String,
  dose: String,
});

export type RecentMedicationAdministration = Static<
  typeof RecentMedicationAdministration
>;
