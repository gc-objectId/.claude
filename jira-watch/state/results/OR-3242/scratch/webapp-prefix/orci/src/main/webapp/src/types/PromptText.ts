import { Record, Static, String } from "runtypes";
import { PromptType } from "./PromptType";

export const PromptText = Record({
  promptType: PromptType,
  displayText: String.nullable(),
});

export type PromptText = Static<typeof PromptText>;
