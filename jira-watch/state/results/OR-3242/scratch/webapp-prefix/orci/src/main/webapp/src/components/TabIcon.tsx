import { Spinner } from "react-bootstrap";
import { ColorLabelSetting } from "../types/ColorLabelSetting";
import { getMedicationLabelStyle } from "../utils/medicationLabelStyle";

export type IconSpec =
  | {
      type: "medicationColor";
      colorSetting: ColorLabelSetting;
    }
  | {
      type: "spinner";
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
          border: "1px solid var(--guided-color-label-frame)",
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
  if (icon.type === "spinner") {
    return (
      <Spinner
        animation="border"
        size="sm"
        className="me-2"
        style={{ verticalAlign: "middle" }}
      />
    );
  }
  return null;
}
