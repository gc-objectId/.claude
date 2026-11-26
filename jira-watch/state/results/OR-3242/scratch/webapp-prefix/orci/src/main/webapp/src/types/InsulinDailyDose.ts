import { Array, Boolean, Record, Static, String } from "runtypes";

export const InsulinDailyDoseCalculation = Record({
  trace: Array(String),
  individualDoses: Array(String).nullable(),
  totalDailyDose: String.nullable(),
  hasInsulinButCalculationFailed: Boolean,
});

export type InsulinDailyDoseCalculation = Static<
  typeof InsulinDailyDoseCalculation
>;

export const InsulinDailyDose = Record({
  home: InsulinDailyDoseCalculation,
  medAdmin: InsulinDailyDoseCalculation,
});

export type InsulinDailyDose = Static<typeof InsulinDailyDose>;
