import { Form } from "react-bootstrap";
import { useMemo } from "react";

export type DoseInputProps = {
  doseInputValue: string | number | undefined;
  doseUnits: string;
  onDoseChange: (value: string) => void;
  showInvalid: boolean;
  patientWeightKg: number | null;
  showWeightBasedDose: boolean;
};

export function DoseInput({
  doseInputValue,
  doseUnits,
  onDoseChange,
  showInvalid,
  showWeightBasedDose,
  patientWeightKg,
}: DoseInputProps) {
  const doseUnitLabel = doseUnits ? `${doseUnits}` : "";

  const weightBasedDoseDisplay = useMemo(() => {
    if (!showWeightBasedDose) {
      return null;
    }
    if (!patientWeightKg || patientWeightKg <= 0) {
      return null;
    }
    const inputValue = Number(doseInputValue);
    if (!Number.isFinite(inputValue) || inputValue <= 0) {
      return null;
    }
    const weightBasedDose = inputValue / patientWeightKg;
    const formattedDose = weightBasedDose.toFixed(1);
    let weightBasedDoseUnitLabel = doseUnitLabel;
    const perKgUnit = weightBasedDoseUnitLabel
      ? `${weightBasedDoseUnitLabel}/kg`
      : "per kg";
    return `≈${formattedDose} ${perKgUnit}`;
  }, [doseInputValue, doseUnitLabel, showWeightBasedDose, patientWeightKg]);

  const showExtraLongInput = useMemo(
    () =>
      // This is a bit of a hack to account for Penicillin's unit, which is "million units"
      // Choosing a mildly arbitrary length for the string at which we will make the input slightly larger to avoid overflowing
      doseUnits.length >= 10,
    [doseUnits],
  );

  return (
    <div className="dose-input">
      <div className="d-flex flex-row pt-1 align-items-center align-self-baseline">
        <label className="fw-bold pe-4" htmlFor="dose-input">
          Dose
        </label>
        <Form.Control
          id="dose-input"
          style={{
            width: showExtraLongInput ? "130px" : "100px",
            height: "50px",
            paddingBottom: weightBasedDoseDisplay ? "15px" : undefined,
            display: "inline-block",
          }}
          type="text"
          placeholder=""
          className={`me-1 ${showInvalid ? "is-invalid" : ""}`}
          onChange={(e) => onDoseChange(e.target.value)}
          value={doseInputValue}
        />
        <span style={{ marginLeft: "2px" }}>{doseUnitLabel}</span>
      </div>
      {weightBasedDoseDisplay && (
        <div className="weight-based-dose-label text-muted">
          {weightBasedDoseDisplay}
        </div>
      )}
    </div>
  );
}
