import { Record, Union, Literal, Array, Static, String } from "runtypes";

export const AllergenSuppressionState = Union(
  Literal("NORMAL"),
  Literal("SUPPRESSED"),
);
export type AllergenSuppressionState = Static<typeof AllergenSuppressionState>;

export const AllergySuppressionSetting = Record({
  suppressionState: AllergenSuppressionState,
  reactions: Array(String),
});

export type AllergySuppressionSetting = Static<
  typeof AllergySuppressionSetting
>;
