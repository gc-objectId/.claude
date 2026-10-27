import { Array, Dictionary, Record, Static } from "runtypes";
import { Guidance } from "./Guidance";
import { DoseOption } from "./DoseOption";
import { Citation } from "./Citation";
import { CitationsLocation } from "./CitationsLocation";
import { TrackingTabID, AlertResultID } from "./identifiers";
import { DoseUnits } from "./Medication";
import { MedicationRoute } from "./MedicationRoute";
import { AlertDefinition } from "./AlertDefinition";
import { BannerDefinition } from "./BannerDefinition";

export const DosingFormPerRouteState = Record({
  warnings: Array(BannerDefinition),
  infos: Array(BannerDefinition),
  doseOptions: Array(DoseOption),
  indicationDoseOptions: Dictionary(Array(DoseOption)),
  doseUnits: DoseUnits.nullable(),
  citations: Array(
    Record({
      evaluationResultId: AlertResultID,
      citation: Citation,
      location: CitationsLocation,
    }),
  ),
});

export type DosingFormPerRouteState = Static<typeof DosingFormPerRouteState>;

export const DosingFormState = Record({
  trackingTabId: TrackingTabID,
  alerts: Array(AlertDefinition),
  guidance: Array(Guidance),
  perRouteState: Dictionary(DosingFormPerRouteState, MedicationRoute),
});
export type DosingFormState = Static<typeof DosingFormState>;
