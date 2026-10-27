import { useCallback } from "react";

import { CaseID, PatientID, TenantID } from "../types/identifiers";
import {
  GuidanceNotification,
  GuidanceNotificationPayload,
  GuidanceNotificationTypeEnum,
} from "../types/GuidanceNotification";
import { useRuleSettings } from "../hooks/hooks";
import { IMessage } from "@stomp/stompjs/src/i-message";
import { remove } from "lodash";
import { useWebsocketSubscription } from "../context/WebsocketContext";
import { RuleExecutionResultController } from "@api";
import * as Sentry from "@sentry/react";

import { logger } from "../utils/logger";
export type GuidanceSocketProps = {
  patientId: PatientID;
  tenantId: TenantID;
  caseId: CaseID;
  guidanceNotification(data: GuidanceNotificationPayload): void;
  guidanceOperationCompleted(data: unknown): void;
  guidanceOperationEnding(data: unknown): void;
  onOperationUpdated(data: GuidanceNotificationPayload): void;
  onMedicationScanReminder(): void;
};

const GuidanceSocket = ({
  patientId,
  tenantId,
  caseId,
  guidanceNotification,
  guidanceOperationCompleted,
  guidanceOperationEnding,
  onOperationUpdated,
  onMedicationScanReminder,
}: GuidanceSocketProps) => {
  return (
    <InnerGuidanceSocket
      patientId={patientId}
      caseId={caseId}
      tenantId={tenantId}
      guidanceNotification={guidanceNotification}
      guidanceOperationCompleted={guidanceOperationCompleted}
      guidanceOperationEnding={guidanceOperationEnding}
      onOperationUpdated={onOperationUpdated}
      onMedicationScanReminder={onMedicationScanReminder}
    />
  );
};

const InnerGuidanceSocket = ({
  patientId,
  tenantId,
  caseId,
  guidanceNotification,
  guidanceOperationCompleted,
  guidanceOperationEnding,
  onOperationUpdated,
  onMedicationScanReminder,
}: GuidanceSocketProps) => {
  const ruleSettings = useRuleSettings();

  const onMessage = useCallback(
    (message: IMessage) => {
      const guidance = JSON.parse(message.body) as GuidanceNotification;

      if (guidance.type === "MEDICATION_SCAN_REMINDER") {
        onMedicationScanReminder();
        return;
      }

      logger.debug("Websocket payload: ", guidance);
      if (
        guidance.payload.patient.pmrn !== patientId ||
        guidance.payload.operation.caseId !== caseId
      ) {
        console.warn("Patient/operation mismatch");
        logger.debug(
          "Expected: pmrn:",
          patientId + " caseId:" + caseId,
          " got pmrn:",
          guidance.payload.patient.pmrn,
          " caseId:",
          guidance.payload.operation.caseId,
        );
        return;
      }
      if (guidance.type === GuidanceNotificationTypeEnum.ALERT) {
        const suppressedRulesIds = new Set(
          guidance.payload.alerts
            .map((alert) => alert.ruleIdentifier)
            .filter((id) => ruleSettings.isRuleSuppressed(id)),
        );
        logger.debug("ignoring suppressed rules:", suppressedRulesIds);
        remove(guidance.payload.alerts, (alert) =>
          suppressedRulesIds.has(alert.ruleIdentifier),
        );
        guidance.payload.alerts.forEach((alert) => {
          RuleExecutionResultController.markAsSeen({
            path: { resultId: alert.resultId },
            headers: { "X-Tenant-Id": tenantId },
          }).then((result) => {
            if (result.error === undefined) return;
            const status = result.response?.status;
            logger.error(
              "Failed to mark alert as seen",
              alert.resultId,
              status,
            );
            Sentry.captureException(
              new Error(
                `HTTP ${
                  status ?? "network"
                }: POST /api/firings/{resultId}/seen`,
              ),
              {
                tags: {
                  http_status: String(status ?? "network"),
                  tenant: tenantId,
                },
                level:
                  status !== undefined && status >= 500 ? "error" : "warning",
              },
            );
          });
        });
        guidanceNotification(guidance.payload);
      } else if (
        guidance.type === GuidanceNotificationTypeEnum.OPERATION_COMPLETED
      ) {
        guidanceOperationCompleted(guidance.payload);
      } else if (
        guidance.type === GuidanceNotificationTypeEnum.OPERATION_ENDING
      ) {
        guidanceOperationEnding(guidance.payload);
      } else if (
        guidance.type === GuidanceNotificationTypeEnum.OPERATION_UPDATED
      ) {
        onOperationUpdated(guidance.payload);
      }
    },
    [
      caseId,
      guidanceNotification,
      guidanceOperationCompleted,
      guidanceOperationEnding,
      onMedicationScanReminder,
      onOperationUpdated,
      patientId,
      ruleSettings,
      tenantId,
    ],
  );

  useWebsocketSubscription(`guidance/${tenantId}/${patientId}`, onMessage);

  return <></>;
};

export default GuidanceSocket;
