import { Record, Static, String, Array, Dictionary, Unknown } from "runtypes";
import { MedicationUUID } from "./identifiers";
import { MedicationRouteOption } from "./MedicationRouteOption";
import { ConcentrationOption } from "./ConcentrationOption";
import { MedicationRoute } from "./MedicationRoute";
import { DoseUnits } from "./DoseUnits";

export const MedicationOptionWithConcentration = Record({
  medicationIdentifier: String,
  medicationName: String,
  concentrationOptions: Array(ConcentrationOption).optional(),
  availableRoutes: Array(MedicationRoute).nullable(),
  routeDoseUnits: Dictionary(DoseUnits, String).optional(),
});

export type MedicationOptionWithConcentration = Static<
  typeof MedicationOptionWithConcentration
>;
