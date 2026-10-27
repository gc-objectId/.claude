import { Array, Boolean, Record, Static, String } from "runtypes";
import { Medication } from "./Medication";
import { EvaluationResult } from "./EvaluationResult";
import { TrackingTabID } from "./identifiers";
import { DosingFormState } from "./DosingFormState";
import { SelectedMedication } from "./SelectedMedication";

export const MedicationSelectionCheckResponse = Record({
  context: SelectedMedication,
  results: Array(EvaluationResult),
  trackingTabId: TrackingTabID,
  dosingFormState: DosingFormState,
  restoredTab: Boolean,
});

export type MedicationSelectionCheckResponse = Static<
  typeof MedicationSelectionCheckResponse
>;
