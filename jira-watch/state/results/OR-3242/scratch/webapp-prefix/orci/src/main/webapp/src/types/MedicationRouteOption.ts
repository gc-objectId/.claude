import { Array, Record, Static } from "runtypes";
import { MedicationRoute } from "./MedicationRoute";
import { DoseOption } from "./DoseOption";

export const MedicationRouteOption = Record({
  route: MedicationRoute,
  doseOptions: Array(DoseOption),
});

export type MedicationRouteOption = Static<typeof MedicationRouteOption>;
