import { Card } from "react-bootstrap";
import {
  AlertBody,
  RejectAlertPayload,
  RejectAlertResponse,
} from "./AlertBody";
import { AlertHeader } from "./AlertHeader";

import { AlertDefinition } from "../../types/AlertDefinition";

export type AlertCardProps = {
  alert: AlertDefinition;
  acceptAlert(alert: AlertDefinition): void;
  rejectAlert(params: RejectAlertPayload): Promise<RejectAlertResponse>;
  minHeight: string;
  created: Date;
};
const AlertCard = ({
  alert,
  acceptAlert,
  rejectAlert,
  minHeight,
  created = new Date(),
}: AlertCardProps) => {
  return (
    <Card className="mb-3 guidance-alert" data-rule-id={alert.ruleIdentifier}>
      <Card.Header>
        <AlertHeader alert={alert} created={created} />
      </Card.Header>
      <Card.Body className="mt-2">
        <AlertBody
          alert={alert}
          acceptAlert={acceptAlert}
          rejectAlert={rejectAlert}
          minHeight={minHeight}
        />
      </Card.Body>
    </Card>
  );
};

export default AlertCard;
