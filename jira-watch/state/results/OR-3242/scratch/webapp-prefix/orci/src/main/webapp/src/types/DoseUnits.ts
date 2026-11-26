import { Record, Static, String } from "runtypes";

export const DoseUnits = Record({
  units: String,
  label: String,
});

export type DoseUnits = Static<typeof DoseUnits>;
