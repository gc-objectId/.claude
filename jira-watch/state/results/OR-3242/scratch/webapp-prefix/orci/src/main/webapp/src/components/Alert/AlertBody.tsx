import { RuleCitationContainer } from "./RuleCitationContainer";
import { REJECTION_REASON_OTHER } from "./constants";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { RejectButtons } from "./RejectButtons";
import { AcceptButton } from "./AcceptButton";
import { sanitizedHtml } from "../../utils/markup";
import { RejectionReasonOption } from "../../types/RejectionReasonOption";

import { AlertDefinition } from "../../types/AlertDefinition";

import { logger } from "../../utils/logger";
export type RejectAlertPayload = {
  alert: AlertDefinition;
  suppressFutureAlertsOfThisType: boolean;
  suppressFutureAlertsForThisAllergy: boolean;
  markMedicationAsTolerated: boolean;
  rejectionOption: string;
  reason: string;
  reasonComment?: string;
  rejectionReasonCustomInput: string;
};

export type RejectAlertResponse = {
  customInputError?: string;
};

export type AlertBodyProps = {
  minHeight: string;
  acceptAlert(alert: AlertDefinition): void;
  rejectAlert(params: RejectAlertPayload): Promise<RejectAlertResponse>;
  alert: AlertDefinition;
};

export function AlertBody({
  minHeight,
  acceptAlert,
  rejectAlert,
  alert,
}: AlertBodyProps) {
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionOption, setRejectionOption] = useState<string>("");
  const [rejectionReasonCustomInput, setRejectionReasonCustomInput] =
    useState<string>("");
  const [rejectionReasonCustomInputError, setRejectionReasonCustomInputError] =
    useState<string>("");
  const [rejectionReasonComment, setRejectionReasonComment] =
    useState<string>("");

  useEffect(() => {
    const reason = alert?.rejectReasons.filter(
      (reason: RejectionReasonOption) => reason.reason === rejectionReason,
    );
    if (reason.length === 0) {
      // we don't set send down OTHER as a option, we just create it on the frontend
      // TODO: OTHER should be provided by the backend
      setRejectionOption(REJECTION_REASON_OTHER.toUpperCase());
    } else {
      setRejectionOption(reason[0].rejectionReason);
    }
  }, [alert, rejectionReason]);

  const handleRejectionSelect = useCallback(
    async (
      resultId: string,
      rejectionOption: string,
      reason: string,
      reasonComment: string,
      suppressFutureAlertsOfThisType: boolean,
      suppressFutureAlertsForThisAllergy: boolean,
      markMedicationAsTolerated: boolean,
      rejectionReasonCustomInput: string,
    ) => {
      logger.debug(
        "handling alert rejection. ResultId:",
        resultId,
        "reason:",
        reason,
      );
      logger.debug("reason-comment:", reasonComment);
      let result: RejectAlertResponse;
      if (REJECTION_REASON_OTHER === reason) {
        result = await rejectAlert({
          alert,
          suppressFutureAlertsOfThisType,
          suppressFutureAlertsForThisAllergy,
          markMedicationAsTolerated,
          rejectionOption,
          reason,
          reasonComment,
          rejectionReasonCustomInput,
        });
      } else {
        result = await rejectAlert({
          alert,
          suppressFutureAlertsOfThisType,
          suppressFutureAlertsForThisAllergy,
          markMedicationAsTolerated,
          rejectionOption,
          reason,
          rejectionReasonCustomInput,
        });
      }

      if (result.customInputError) {
        setRejectionReasonCustomInputError(result.customInputError);
      }
    },
    [rejectAlert, alert],
  );

  const handleRejectionInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setRejectionReasonComment(e.target.value);
    },
    [],
  );

  const isSubmitEnabled =
    rejectionReason &&
    (rejectionReason !== REJECTION_REASON_OTHER || rejectionReasonComment);

  const handleAcceptAlert = useCallback(() => {
    acceptAlert(alert);
  }, [acceptAlert, alert]);

  const content = alert?.description?.split("<Citation></Citation>");

  return (
    <div>
      <div style={minHeight ? { minHeight: minHeight } : {}}>
        <div
          className="alert-body-container"
          data-testid={alert.ruleIdentifier + "-body"}
        >
          {content != null && content.length == 2 ? (
            <div>
              <span dangerouslySetInnerHTML={sanitizedHtml(content[0])}></span>{" "}
              <RuleCitationContainer
                citations={alert?.citations}
                evaluationResultId={alert?.resultId}
              />
              <span dangerouslySetInnerHTML={sanitizedHtml(content[1])}></span>
            </div>
          ) : (
            <>
              <span
                className="me-2"
                dangerouslySetInnerHTML={sanitizedHtml(alert?.description)}
              ></span>{" "}
              <div style={{ display: "inline-block", marginLeft: "-6px" }}>
                <RuleCitationContainer
                  citations={alert?.citations}
                  evaluationResultId={alert?.resultId}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 alert-button-container">
        <div className="accept-button-container">
          <AcceptButton
            onClick={handleAcceptAlert}
            value={alert.resultId}
            alert={alert}
          />
        </div>
        <div className="reject-button-container">
          <RejectButtons
            alert={alert}
            rejectionReason={rejectionReason}
            setRejectionReason={setRejectionReason}
            onChange={handleRejectionInputChange}
            suppressionAllowed={alert.allowSuppression}
            rejectionReasonCustomInputError={rejectionReasonCustomInputError}
            rejectionReasonCustomInput={rejectionReasonCustomInput}
            setRejectionReasonCustomInput={setRejectionReasonCustomInput}
            onSubmit={(
              suppressFutureAlertsOfThisType,
              suppressFutureAlertsForThisAllergy,
              markMedicationAsTolerated,
              rejectionReasonCustomInput,
            ) => {
              setRejectionReasonCustomInputError("");
              handleRejectionSelect(
                alert.resultId,
                rejectionOption,
                rejectionReason,
                rejectionReasonComment,
                suppressFutureAlertsOfThisType,
                suppressFutureAlertsForThisAllergy,
                markMedicationAsTolerated,
                rejectionReasonCustomInput,
              );
            }}
            disabled={!isSubmitEnabled}
          />
        </div>
      </div>
    </div>
  );
}
