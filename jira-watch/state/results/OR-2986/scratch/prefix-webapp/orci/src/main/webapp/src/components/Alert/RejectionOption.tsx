import { Dropdown } from "react-bootstrap";
import { RejectionReasonOption } from "../../types/RejectionReasonOption";
import { RuleID } from "../../types/identifiers";

export type RejectionOptionProps = {
  ruleId: RuleID;
  index: number;
  reason: RejectionReasonOption;
  rejectionReason: string;
  setRejectionReason(reason: string): void;
  setRejectionReasonCustomInput(value: string): void;
  rejectionReasonCustomInput: string;
  rejectionReasonCustomInputError: string;
};

export function RejectionOption({
  ruleId,
  reason,
  rejectionReason,
  index,
  setRejectionReason,
  setRejectionReasonCustomInput,
  rejectionReasonCustomInput,
  rejectionReasonCustomInputError,
}: RejectionOptionProps) {
  return (
    <Dropdown.ItemText
      key={reason.reason}
      data-testid={ruleId + "-reject-option-" + index}
      className={`dropdown-item d-flex flex-row ${
        rejectionReason === reason.reason ? "active" : ""
      } small pointer`}
      onClick={() => setRejectionReason(reason.reason)}
    >
      {" "}
      {reason.customInput ? (
        <div>
          <div style={{ display: "flex" }}>
            <span className="me-2 pt-1">{reason.reason}</span>
            <input
              name="customInput"
              style={{
                display: "inline-block",
              }}
              onChange={(e) => setRejectionReasonCustomInput(e.target.value)}
              value={rejectionReasonCustomInput}
              placeholder={reason.customInputLabel || ""}
              className={
                "form-control form-control-sm small" +
                (rejectionReasonCustomInputError === "" ? "" : " invalid")
              }
            />
          </div>
          {rejectionReasonCustomInputError && (
            <div className="guided-maroon">
              {rejectionReasonCustomInputError}
            </div>
          )}
        </div>
      ) : (
        reason.reason
      )}
    </Dropdown.ItemText>
  );
}
