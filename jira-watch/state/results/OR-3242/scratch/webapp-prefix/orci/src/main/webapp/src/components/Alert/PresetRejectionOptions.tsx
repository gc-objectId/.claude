import { Dropdown } from "react-bootstrap";
import { RejectionOption } from "./RejectionOption";
import { RejectionReasonOption } from "../../types/RejectionReasonOption";
import { RuleID } from "../../types/identifiers";

export type PresetRejectionOptionsProps = {
  ruleId: RuleID;
  rejectReasons: RejectionReasonOption[];
  rejectionReason: string;
  setRejectionReason(reason: unknown): void;
  setRejectionReasonCustomInput(value: string): void;
  rejectionReasonCustomInput: string;
  rejectionReasonCustomInputError: string;
};

export function PresetRejectionOptions({
  ruleId,
  rejectReasons,
  rejectionReason,
  setRejectionReason,
  setRejectionReasonCustomInput,
  rejectionReasonCustomInput,
  rejectionReasonCustomInputError,
}: PresetRejectionOptionsProps) {
  return (
    <>
      <Dropdown.ItemText className="small">
        {rejectReasons?.length > 0 ? <b>Select Reason: </b> : <b>Reason:</b>}
      </Dropdown.ItemText>
      {/*TODO implement proper rejection options with optional input text*/}
      {rejectReasons?.map((reason, i) => (
        <RejectionOption
          ruleId={ruleId}
          key={reason.rejectionReason}
          index={i}
          reason={reason}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          rejectionReasonCustomInputError={rejectionReasonCustomInputError}
          rejectionReasonCustomInput={rejectionReasonCustomInput}
          setRejectionReasonCustomInput={setRejectionReasonCustomInput}
        />
      ))}
    </>
  );
}
