import { Record, Static, String } from "runtypes";
import { AllergyReactionID } from "./identifiers";

export const AllergyReaction = Record({
  id: AllergyReactionID,
  reaction: String,
  severity: String,
});

export type AllergyReaction = Static<typeof AllergyReaction>;
