import { ColorLabelSetting } from "../types/ColorLabelSetting";
import { getMedicationLabelStyle } from "../utils/medicationLabelStyle";

export type IconSpec = {
  type: "medicationColor";
  colorSetting: ColorLabelSetting;
};

export type TabIconProps = {
  icon: IconSpec;
};

export function TabIcon({ icon }: TabIconProps) {
  if (icon.type === "medicationColor") {
    if (icon.colorSetting.thickness === null) return null;
    const style = getMedicationLabelStyle(icon.colorSetting, true);
    return (
      <div
        style={{
          border: "1px solid #c4c4c4",
          ...style,
          width: "15px",
          height: "20px",
          backgroundSize: "145px",
          backgroundPosition: "left center",
          verticalAlign: "middle",
          display: "inline-block",
          marginRight: "4px",
        }}
      />
    );
  }
  return null;
}
