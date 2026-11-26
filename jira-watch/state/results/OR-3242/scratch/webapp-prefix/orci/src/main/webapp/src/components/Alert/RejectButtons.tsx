import { Button, Dropdown, Form } from "react-bootstrap";
import { REJECTION_REASON_OTHER } from "./constants";
import { PresetRejectionOptions } from "./PresetRejectionOptions";
import { ChangeEvent, useState } from "react";
import { Prompt } from "../../types/Prompt";
import { grammaticalList } from "../../utils/stringUtils";

import { AlertDefinition } from "../../types/AlertDefinition";
import { useMedicationSelectionContext } from "../../context/MedicationSelectionContext";

export type RejectButtonsProps = {
  disabled: boolean;
  onChange(e: ChangeEvent<HTMLInputElement>): void;
  onSubmit(
    suppressFutureAlertsOfThisType: boolean,
    suppressFutureAlertsForThisAllergy: boolean,
    markMedicationAsTolerated: boolean,
    rejectionReasonCustomInput: string,
  ): void;
  alert: AlertDefinition;
  rejectionReason: string;
  setRejectionReason(s: string): void;
  suppressionAllowed: boolean;
  setRejectionReasonCustomInput(value: string): void;
  rejectionReasonCustomInput: string;
  rejectionReasonCustomInputError: string;
};

export function RejectButtons({
  disabled,
  onChange,
  onSubmit,
  alert,
  rejectionReason,
  setRejectionReason,
  suppressionAllowed,
  setRejectionReasonCustomInput,
  rejectionReasonCustomInput,
  rejectionReasonCustomInputError,
}: RejectButtonsProps) {
  const medicationSelectionContext = useMedicationSelectionContext();

  const [suppressFutureAlertsOfThisType, setSuppressFutureAlertsOfThisType] =
    useState(false);

  const [
    suppressFutureAlertsForThisAllergy,
    setSuppressFutureAlertsForThisAllergy,
  ] = useState(false);

  const [medicationIsTolerated, setMedicationIsTolerated] = useState(false);
  return (
    <Dropdown drop="up" className="reject-reasons text-nowrap">
      <Dropdown.Toggle
        variant="secondary"
        className="text-nowrap alert-response-btn"
        id={alert.ruleIdentifier + "-reject-button"}
      >
        {alert?.rejectText}
      </Dropdown.Toggle>
      <Dropdown.Menu style={{ minWidth: "320px" }}>
        <PresetRejectionOptions
          ruleId={alert.ruleIdentifier}
          rejectReasons={alert?.rejectReasons}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          rejectionReasonCustomInputError={rejectionReasonCustomInputError}
          rejectionReasonCustomInput={rejectionReasonCustomInput}
          setRejectionReasonCustomInput={setRejectionReasonCustomInput}
        />
        <Dropdown.ItemText
          className={`dropdown-item d-flex flex-row ${
            rejectionReason === REJECTION_REASON_OTHER ? "active" : ""
          }`}
          onClick={() => setRejectionReason(REJECTION_REASON_OTHER)}
        >
          {alert?.rejectReasons?.length > 0 ? (
            <label className="me-2 pt-1 small pointer">Other</label>
          ) : (
            <></>
          )}

          <Form.Control
            className="form-control-sm small"
            style={{ display: "inline-block" }}
            onChange={onChange}
            type="text"
            placeholder="Reason"
          />
        </Dropdown.ItemText>

        {suppressionAllowed ? (
          <div className="d-flex justify-content-end">
            <div className="me-3 mt-1 small">
              <label>
                <input
                  name="suppressForCase"
                  type="checkbox"
                  checked={suppressFutureAlertsOfThisType}
                  onChange={(e) =>
                    setSuppressFutureAlertsOfThisType(e.target.checked)
                  }
                />{" "}
                Do not alert again for this case
              </label>
            </div>
          </div>
        ) : (
          <></>
        )}

        <div className="d-flex flex-column  align-items-start justify-content-end">
          {alert.allowAllergySuppression ? (
            <AllergySuppressionInput
              relevantAllergies={alert.relevantAllergies}
              checked={suppressFutureAlertsForThisAllergy}
              onChange={(checked) =>
                setSuppressFutureAlertsForThisAllergy(checked)
              }
            />
          ) : (
            <></>
          )}

          {alert.allowMarkTolerated ? (
            <MarkToleratedInput
              medicationName={
                medicationSelectionContext?.medication?.medicationName || ""
              }
              checked={medicationIsTolerated}
              onChange={(checked) => setMedicationIsTolerated(checked)}
            />
          ) : (
            <></>
          )}
        </div>

        <div className="d-flex justify-content-end">
          <Button
            variant="primary"
            size="sm"
            className="mt-1 mx-3"
            onClick={() =>
              onSubmit(
                suppressFutureAlertsOfThisType,
                suppressFutureAlertsForThisAllergy,
                medicationIsTolerated,
                rejectionReasonCustomInput,
              )
            }
            disabled={disabled}
          >
            Submit
          </Button>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

function AllergySuppressionInput({
  relevantAllergies,
  checked,
  onChange,
}: {
  relevantAllergies: Prompt["relevantAllergies"];
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <div className="d-flex justify-content-end">
      <div className="me-3 ms-3 mt-1 small">
        <label>
          <input
            name="suppressThisAllergy"
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />{" "}
          Disable all{" "}
          <span>
            {grammaticalList(relevantAllergies?.map((it) => it.allergen) || [])}{" "}
            allergy alerts for this case
          </span>
        </label>
      </div>
    </div>
  );
}

function MarkToleratedInput({
  medicationName,
  checked,
  onChange,
}: {
  medicationName: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <div className="d-flex justify-content-end">
      <div className="me-3 ms-3 mt-1 small">
        <label>
          <input
            name="markSelectedMedicationAsTolerated"
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />{" "}
          Disable all {medicationName} cross-reaction alerts for this case
        </label>
      </div>
    </div>
  );
}
