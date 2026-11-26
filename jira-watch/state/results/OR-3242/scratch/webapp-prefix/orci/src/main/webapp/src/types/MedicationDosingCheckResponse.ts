import { Array, Record, Static } from "runtypes";
import { AlertDefinition } from "./AlertDefinition";
import { MedicationDosingDTO } from "./MedicationDosingDTO";
import { TrackingTabID } from "./identifiers";

export const MedicationDosingCheckResponse = Record({
  context: MedicationDosingDTO,
  alerts: Array(AlertDefinition),
  trackingTabId: TrackingTabID,
});

export type MedicationDosingCheckResponse = Static<
  typeof MedicationDosingCheckResponse
>;
