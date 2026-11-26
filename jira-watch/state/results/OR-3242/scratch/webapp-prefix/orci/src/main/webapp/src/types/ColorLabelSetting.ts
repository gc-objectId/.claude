import { Boolean, Literal, Record, Static, String, Union } from "runtypes";

export const ColorLabelSettingThickness = Union(
  Literal("thick"),
  Literal("thin"),
);
export type ColorLabelSettingThickness = Static<
  typeof ColorLabelSettingThickness
>;

export const ColorLabelSetting = Record({
  hatched: Boolean.nullable(),
  topColor: String.nullable(),
  bottomColor: String.nullable(),
  thickness: ColorLabelSettingThickness.nullable(),
});

export type ColorLabelSetting = Static<typeof ColorLabelSetting>;
