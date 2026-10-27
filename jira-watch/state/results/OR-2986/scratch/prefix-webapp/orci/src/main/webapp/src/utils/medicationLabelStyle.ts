// @ts-ignore
import hatchPattern from "../components/hatch-pattern.png";
import { ColorLabelSetting } from "../types/ColorLabelSetting";
import { ColorLabelSettingsDto } from "@api";

export const getMedicationLabelStyle = (
  colorLabelSetting: ColorLabelSetting | ColorLabelSettingsDto,
  isTabIcon: boolean,
): any => {
  let border = null;
  let borderRight = null;
  let hatchPatternURL = "";
  if (colorLabelSetting.thickness === "thick") {
    if (isTabIcon) {
      border = "2px solid #000000";
    } else {
      border = "6px solid #000000";
    }
  } else if (colorLabelSetting.thickness === "thin") {
    if (isTabIcon) {
      border = "1px solid #dee2e6";
    } else {
      borderRight = "1px solid #dee2e6";
    }
  }
  let topColor = colorLabelSetting.topColor
    ? colorLabelSetting.topColor
    : "#ffffff";
  let bottomColor = colorLabelSetting.bottomColor
    ? colorLabelSetting.bottomColor
    : "#ffffff";
  if (colorLabelSetting.hatched) {
    hatchPatternURL = hatchPattern;
  }
  if (border) {
    return {
      border: border,
      backgroundImage: `url(${hatchPatternURL}), linear-gradient(${topColor} 50%, ${bottomColor} 50%)`,
    };
  } else if (borderRight) {
    return {
      borderRight: borderRight,
      backgroundImage: `url(${hatchPatternURL}), linear-gradient(${topColor} 50%, ${bottomColor} 50%)`,
    };
  }
  return {};
};
