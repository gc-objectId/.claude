import { Record, Static } from "runtypes";
import { EncounterID } from "./identifiers";

export const Encounter = Record({
  encounterId: EncounterID,
});
export type Encounter = Static<typeof Encounter>;
