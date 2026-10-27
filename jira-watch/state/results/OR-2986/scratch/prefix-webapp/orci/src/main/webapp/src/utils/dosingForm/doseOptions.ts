import { DoseOption } from "../../types/DoseOption";

export function isWeightBasedDoseOption(dose: DoseOption) {
  let calculatedAmount = parseFloat(
    dose.calculatedDoseAmount.replace(/,/g, ""),
  );

  return (
    calculatedAmount != dose.doseAmount &&
    dose.calculatedDoseUnits != dose.doseUnits
  );
}
