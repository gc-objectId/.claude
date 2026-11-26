import { Record, Static, String, Number } from "runtypes";

export const Concentration = Record({
  rawAmount: String,
  unit: String,
  amount: Number,
});

export type Concentration = Static<typeof Concentration>;
