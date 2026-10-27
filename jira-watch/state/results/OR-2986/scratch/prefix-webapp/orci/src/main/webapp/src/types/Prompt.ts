import { Array, Boolean, Dictionary, Record, Static, String } from "runtypes";
import { RejectionReasonOption } from "./RejectionReasonOption";
import { Citation } from "./Citation";
import { PromptType } from "./PromptType";
import { CitationsLocation } from "./CitationsLocation";
import { MedicationRoute } from "./MedicationRoute";
import { PromptText } from "./PromptText";

export const Prompt = Record({
  ruleIdentifier: String,
  type: PromptType.nullable(),
  trigger: String.nullable(),
  title: String.nullable(),
  tabName: String.nullable(),
  description: String.nullable(),
  acceptText: String.nullable(),
  rejectText: String.nullable(),
  rejectReasons: Array(RejectionReasonOption),
  citations: Array(Citation),
  routeBasedCitations: Dictionary(Array(Citation), MedicationRoute).nullable(),
  citationsLocation: CitationsLocation,
  routeBasedPromptText: Dictionary(PromptText, MedicationRoute).nullable(),
  promptText: PromptText.nullable(),
  allowSuppression: Boolean,
  allowAllergySuppression: Boolean.optional(),
  allowMarkTolerated: Boolean.optional(),
  relevantAllergies: Array(
    Record({
      id: String,
      allergen: String,
      reaction: String,
      displayReaction: String,
      severity: String,
    }),
  ).optional(),
  prompty: Boolean.optional(),
});

export type Prompt = Static<typeof Prompt>;
