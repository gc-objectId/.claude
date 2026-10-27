import { TabID, TrackingTabID, UserID } from "./identifiers";
import { Concentration } from "./Concentration";

export type DosingFormPayload = {
  tabKey: TabID;
  doseAmount: string | number | null;
  doseUnits: string | number;
  concentrations: Concentration[];
  route: string;
  selectedIndication?: string;
  timeZone: string;
  adminMonth: string;
  adminDay: string;
  adminYear: string;
  adminHours: string;
  adminMinutes: string;
  medicationIdentifier: string;
  medicationName: string;
  ndc: string;
  userId: UserID;
  trackingTabId: TrackingTabID;
};
