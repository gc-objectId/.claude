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
      border = "2px solid var(--guided-color-label-border-thick)";
    } else {
      border = "6px solid var(--guided-color-label-border-thick)";
    }
  } else if (colorLabelSetting.thickness === "thin") {
    if (isTabIcon) {
      border = "1px solid var(--guided-color-label-border-thin)";
    } else {
      borderRight = "1px solid var(--guided-color-label-border-thin)";
    }
  }
  let topColor = colorLabelSetting.topColor
    ? colorLabelSetting.topColor
    : "var(--guided-color-label-blank)";
  let bottomColor = colorLabelSetting.bottomColor
    ? colorLabelSetting.bottomColor
    : "var(--guided-color-label-blank)";
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
