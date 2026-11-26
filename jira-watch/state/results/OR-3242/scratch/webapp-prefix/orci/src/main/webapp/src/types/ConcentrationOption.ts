import { Record, Static, String, Array } from "runtypes";
import { NDC } from "./identifiers";
import { Concentration } from "./Concentration";

export const ConcentrationOption = Record({
  concentrations: Array(Concentration),
  defaultNDC: NDC,
  label: String.optional(),
});

export type ConcentrationOption = Static<typeof ConcentrationOption>;
