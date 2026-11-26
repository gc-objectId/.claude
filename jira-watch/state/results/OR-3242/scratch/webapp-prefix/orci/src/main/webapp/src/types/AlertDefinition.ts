import {
  Array,
  Boolean,
  Dictionary,
  Record,
  Static,
  String,
  Unknown,
} from "runtypes";
import { AlertResultID, RuleID } from "./identifiers";
import { RejectionReasonOption } from "./RejectionReasonOption";
import { Citation } from "./Citation";
import { PromptText } from "./PromptText";
import { RuleTrigger } from "./RuleTrigger";

export const AlertDefinition = Record({
  resultId: AlertResultID,
  ruleIdentifier: RuleID,
  ruleTrigger: RuleTrigger.nullable().optional(),
  title: String,
  tabName: String.nullable(),
  description: String,
  acceptText: String,
  rejectText: String,
  rejectReasons: Array(RejectionReasonOption),
  citations: Array(Citation),
  promptText: PromptText.nullable(),
  allowSuppression: Boolean,
  allowAllergySuppression: Boolean,
  allowMarkTolerated: Boolean,
  relevantAllergies: Array(
    Record({
      id: String,
      allergen: String,
      reaction: String,
      displayReaction: String,
      severity: String,
    }),
  ),
});
export type AlertDefinition = Static<typeof AlertDefinition>;
