import {
  Array,
  Boolean,
  Dictionary,
  Optional,
  Record,
  Static,
  String,
  Unknown,
} from "runtypes";
import { AlertResultID, RuleID } from "./identifiers";
import { Prompt } from "./Prompt";
import { RuleTrigger } from "./RuleTrigger";
import { MedicationRoute } from "./MedicationRoute";
import { DoseOption } from "./DoseOption";

export const EvaluationResult = Record({
  resultId: AlertResultID,
  ruleId: RuleID,
  ruleTrigger: RuleTrigger,
  explanation: String.nullable(),
  details: Dictionary(Unknown, String),
  needsAction: Boolean,
  prompt: Prompt,
  groupKey: String.nullable(),
  suppressionAllowed: Boolean,
  routeDoseOptionOverride: Dictionary(
    Optional(Array(DoseOption)),
    MedicationRoute,
  ),
  routeWeightBasedDoseOptionOverride: Dictionary(
    Optional(Array(DoseOption)),
    MedicationRoute,
  ),
  routeDefaultDoseOverride: Dictionary(Optional(DoseOption), MedicationRoute),
  defaultDoseOverride: DoseOption.nullable(),
});

export type EvaluationResult = Static<typeof EvaluationResult>;
