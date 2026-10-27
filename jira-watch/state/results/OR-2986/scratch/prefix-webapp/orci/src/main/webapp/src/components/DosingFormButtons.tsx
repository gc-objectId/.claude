import { ConcentrationOption } from "../types/ConcentrationOption";
import { Button, OverlayTrigger } from "react-bootstrap";
import { DoseOption } from "../types/DoseOption";

import { isWeightBasedDoseOption } from "../utils/dosingForm/doseOptions";
import React, { HTMLAttributes } from "react";
import { WeightDoseCalculationTooltip } from "./Alert/WeightDoseCalculationTooltip";
import DOMPurify from "dompurify";
import { sanitizedHtml } from "../utils/markup";

function Units({ value }: { value: string }) {
  return <span style={{ fontSize: "0.8rem" }}>{value}</span>;
}

export function DoseButton({
  dose,
  selected,
  onClick,
  ...props
}: {
  dose: DoseOption;
  onClick: () => void;
  selected: boolean;
} & HTMLAttributes<HTMLButtonElement>) {
  var showWeightCalculation = isWeightBasedDoseOption(dose);
  let classNames = `dose-option ${
    showWeightCalculation ? "weight-based-dose" : "flat-dose"
  } ${props.className}`;
  return (
    <OverlayTrigger
      placement="bottom"
      delay={{ show: 1000, hide: 500 }}
      show={!dose.weightBasedDoseCalculation ? false : undefined}
      overlay={
        <WeightDoseCalculationTooltip>
          <span
            dangerouslySetInnerHTML={sanitizedHtml(
              dose.weightBasedDoseCalculation,
            )}
          ></span>
        </WeightDoseCalculationTooltip>
      }
    >
      <Button
        key={dose.rawLabel}
        variant={selected ? "secondary" : "outline-secondary"}
        data-selected={selected}
        className={classNames}
        onClick={onClick}
        value={dose.calculatedDoseAmount}
      >
        <span className="label">
          {dose.calculatedDoseAmount} <Units value={dose.calculatedDoseUnits} />
        </span>
        <div className="weight-based-dose-label">
          {showWeightCalculation ? (
            `≈${dose.doseAmount} ${dose.doseUnits}`
          ) : (
            <>&nbsp;</>
          )}
        </div>
      </Button>
    </OverlayTrigger>
  );
}

export function ConcentrationButton({
  selected,
  option,
  onClick,
}: {
  onClick: any;
  selected: boolean;
  option: ConcentrationOption;
}) {
  if (option.concentrations?.length == 1) {
    const concentration = option.concentrations[0];
    return (
      <Button
        key={option.label}
        variant={selected ? "secondary" : "outline-secondary"}
        className="me-3 form-option"
        onClick={onClick}
        value={concentration.amount}
      >
        {concentration.rawAmount} <Units value={concentration.unit} />
      </Button>
    );
  } else {
    return (
      <Button
        key={option.label}
        variant={selected ? "secondary" : "outline-secondary"}
        className="me-3 form-option"
        onClick={onClick}
        value=""
      >
        {option.concentrations?.map((concentration, index) => {
          return (
            <>
              {index > 0 ? " - " : ""} {concentration.rawAmount}{" "}
              <Units value={concentration.unit} />
            </>
          );
        })}
      </Button>
    );
  }
}
