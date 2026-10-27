import { Array, Boolean, Record, Static, String } from "runtypes";
import { MedicationIdentifier, MedicationUUID, NDC } from "./identifiers";
import { ConcentrationOption } from "./ConcentrationOption";
import { ColorLabelSetting } from "./ColorLabelSetting";
import { Concentration } from "./Concentration";
import { MedicationRoute } from "./MedicationRoute";

export const SelectedMedication = Record({
  id: MedicationUUID,
  medicationFullName: String,
  medicationName: String,
  medicationIdentifier: MedicationIdentifier,
  ndc: NDC.nullable(),
  concentrationOptions: Array(ConcentrationOption),
  colorLabelSetting: ColorLabelSetting,
  defaultNDC: NDC.nullable(),
  perComponentConcentrations: Array(Concentration).nullable(),
  availableRoutes: Array(MedicationRoute).nullable(),
  isScanned: Boolean.nullable(),
});

export type SelectedMedication = Static<typeof SelectedMedication>;
