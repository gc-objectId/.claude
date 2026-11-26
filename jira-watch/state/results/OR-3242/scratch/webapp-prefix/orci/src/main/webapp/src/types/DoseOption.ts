import { Boolean, Record, Number, Static, String } from "runtypes";

export const DoseOption = Record({
  doseAmount: Number,
  doseUnits: String,
  defaultOption: Boolean,
  calculatedDoseAmount: String,
  calculatedDoseUnits: String,
  calculatedLabel: String,
  weightBasedDoseCalculation: String.nullable(),
  rawLabel: String,
});

export type DoseOption = Static<typeof DoseOption>;
