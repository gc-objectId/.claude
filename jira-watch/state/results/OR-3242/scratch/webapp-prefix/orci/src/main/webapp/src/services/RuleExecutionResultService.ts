import axios from "axios";
import {
  AlertResultID,
  PatientID,
  TenantID,
  TrackingTabID,
} from "../types/identifiers";
import { $request } from "../utils/request";
import { Unknown } from "runtypes";
import { SubmitRuleResponseError } from "../types/SubmitRuleResponseError";
import { RejectAlertResponse } from "../components/Alert/AlertBody";

export const submitRuleResponseErrorToRejectAlertResponse = {
  Left: (value: any): RejectAlertResponse =>
    SubmitRuleResponseError.guard(value)
      ? {
          customInputError: value.error.customInputValueError,
        }
      : {},
  Right: () => ({}),
};

type BaseResponse = {
  patientId: PatientID;
  resultId: AlertResultID;
  clientId: TenantID;
  trackingTabId?: TrackingTabID;
};

type AcceptResponse = BaseResponse & {
  accepted: true;
};

type RejectResponse = BaseResponse & {
  accepted: false;
  suppressFutureAlertsOfThisType: boolean;
  suppressFutureAlertsForThisAllergy: boolean;
  markMedicationAsTolerated: boolean;
  rejectionOption: string;
  reason?: string;
  reasonComment?: string;
  rejectionReasonCustomInput?: string;
};

export class RuleExecutionResultService {
  submitResponse = async (response: AcceptResponse | RejectResponse) => {
    const { accepted, patientId, resultId, clientId, trackingTabId } = response;
    return $request(
      {
        url: `/api/patient/${patientId}/alert/${resultId}`,
        data: {
          accepted: accepted,
          rejectionOption: response.accepted ? null : response.rejectionOption,
          reason: response.accepted ? null : response.reason,
          reasonComment: response.accepted ? null : response.reasonComment,
          suppressFutureAlertsOfThisType: response.accepted
            ? null
            : response.suppressFutureAlertsOfThisType,
          suppressFutureAlertsForThisAllergy: response.accepted
            ? null
            : response.suppressFutureAlertsForThisAllergy,
          rejectionReasonCustomInputValue: response.accepted
            ? null
            : response.rejectionReasonCustomInput,
          markMedicationAsTolerated: response.accepted
            ? null
            : response.markMedicationAsTolerated,
          trackingTabId: trackingTabId,
        },
        method: "POST",
        headers: {
          "X-Tenant-Id": clientId,
          "Content-Type": "application/json",
        },
      },
      Unknown,
      SubmitRuleResponseError,
    );
  };

  getAlert = async (
    patientId: PatientID,
    resultId: AlertResultID,
    clientId: TenantID,
  ) => {
    return axios.get("/api/patient/" + patientId + "/alert/" + resultId, {
      headers: {
        "X-Tenant-Id": clientId,
        "Content-Type": "application/json",
      },
    });
  };
}

export default RuleExecutionResultService;
