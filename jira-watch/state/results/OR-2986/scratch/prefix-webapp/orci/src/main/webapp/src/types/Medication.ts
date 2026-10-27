import { Array, Dictionary, Optional, Record, Static, String } from "runtypes";
import { MedicationIdentifier, MedicationUUID, NDC } from "./identifiers";
import { MedicationRouteOption } from "./MedicationRouteOption";
import { ConcentrationOption } from "./ConcentrationOption";
import { ColorLabelSetting } from "./ColorLabelSetting";
import { Concentration } from "./Concentration";
import { DoseOption } from "./DoseOption";
import { MedicationRoute } from "./MedicationRoute";

export const DoseUnits = Record({
  units: String,
  label: String,
});
export type DoseUnits = Static<typeof DoseUnits>;

export const Medication = Record({
  id: MedicationUUID,
  medicationFullName: String,
  medicationName: String,
  medicationCategories: Array(String),
  medicationIdentifier: MedicationIdentifier,
  ndc: NDC.nullable(),
  associatedNDCs: Array(NDC).nullable(),
  routeDoseOptions: Array(MedicationRouteOption),
  routeDoseUnits: Dictionary(Optional(DoseUnits), MedicationRoute),
  routeWeightBasedDoseOptions: Array(MedicationRouteOption),
  concentrationOptions: Array(ConcentrationOption),
  colorLabelSetting: ColorLabelSetting,
  defaultNDC: NDC.nullable(),
  perComponentConcentrations: Array(Concentration).nullable(),
  availableRoutes: Array(MedicationRoute).nullable(),
});

export type Medication = Static<typeof Medication>;
