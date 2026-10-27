import { Card } from "react-bootstrap";
import {
  AlertBody,
  RejectAlertPayload,
  RejectAlertResponse,
} from "./AlertBody";
import { AlertHeader } from "./AlertHeader";
import { AlertDefinition } from "../../types/AlertDefinition";

export type MultiAlertCardProps = {
  alert: AlertDefinition;
  acceptAlert(alert: AlertDefinition): void;
  rejectAlert(params: RejectAlertPayload): Promise<RejectAlertResponse>;
  minHeight: string;
  created: Date;
};
const MultiAlertCard = ({
  alert,
  acceptAlert,
  rejectAlert,
  minHeight,
  created = new Date(),
}: MultiAlertCardProps) => {
  return (
    <div className="mb-3 guidance-alert" data-rule-id={alert.ruleIdentifier}>
      <Card.Header>
        <AlertHeader alert={alert} created={created} />
      </Card.Header>
      <Card.Body>
        <AlertBody
          alert={alert}
          acceptAlert={acceptAlert}
          rejectAlert={rejectAlert}
          minHeight={minHeight}
        />
      </Card.Body>
    </div>
  );
};

export default MultiAlertCard;
