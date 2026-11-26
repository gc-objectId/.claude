import { Array, Record, Static, String } from "runtypes";
import { AlertResultID, RuleID } from "./identifiers";
import { PromptType } from "./PromptType";
import { Citation } from "./Citation";

export const BannerDefinition = Record({
  evaluationResultId: AlertResultID,
  ruleId: RuleID,
  type: PromptType,
  body: String.nullable(),
  citations: Array(Citation),
});
export type BannerDefinition = Static<typeof BannerDefinition>;
