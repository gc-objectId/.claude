import { Medication } from "./Medication";
import { AlertDefinition } from "./AlertDefinition";
import { TabType } from "./TabType";
import { DateTime } from "luxon";
import { NDC, TabID, TrackingTabID } from "./identifiers";
import { Guidance } from "./Guidance";

import { DosingFormState } from "./DosingFormState";
import { SelectedMedication } from "./SelectedMedication";

export type TabData = {
  name: TabID;
  type: TabType;
  title: string;
  canClose?: boolean;
  isStale?: boolean;
  medication?: SelectedMedication;
  created: DateTime;
  guidance?: AlertDefinition[];
  dosingFormState?: DosingFormState;
  staleTimer?: any;
  ndc?: NDC | null;
  playAlertSound?: boolean;
  trackingTabId?: TrackingTabID;
};
