import "./GuidanceAlert.scss";
import React, { useEffect, useMemo, useState } from "react";
import { Col, Container, ListGroup, Row } from "react-bootstrap";

import AlertCard from "./Alert/AlertCard";
import MultiAlertCard from "./Alert/MultiAlertCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { RejectAlertPayload, RejectAlertResponse } from "./Alert/AlertBody";
import { playBeep } from "../utils/dosingForm/playAlertAudio";

import { AlertDefinition } from "../types/AlertDefinition";

import { logger } from "../utils/logger";
export type GuidanceAlertProps = {
  acceptAlert(alert: AlertDefinition): void;
  rejectAlert(params: RejectAlertPayload): Promise<RejectAlertResponse>;
  alerts?: AlertDefinition[];
  minHeight?: string;
  playAlertSound?: boolean;
  title: string;
  colSize?: number | null;
  created?: Date;
};

const GuidanceAlert = ({
  acceptAlert,
  alerts,
  minHeight = "",
  playAlertSound = false,
  rejectAlert,
  title,
  colSize = null,
  created,
}: GuidanceAlertProps) => {
  // Keep a stable created timestamp when callers do not provide one.
  const createdAt = useMemo(() => created ?? new Date(), [created]);

  const [guidanceAlerts, setGuidanceAlerts] = useState<AlertDefinition[]>([]);

  useEffect(() => {
    logger.debug("Guidance Alert Initialized");
    if (alerts) {
      setGuidanceAlerts(alerts);
    }
  }, [alerts]);

  useEffect(() => {
    logger.debug("Guidance Alerts Update:", guidanceAlerts);
    if (guidanceAlerts.length > 0) {
      logger.debug("Guidance alert for ", title);
      if (playAlertSound) {
        playBeep();
      }
    }
  }, [guidanceAlerts, playAlertSound, title]);

  if (guidanceAlerts === null || guidanceAlerts.length === 0) {
    return <></>;
  }
  return guidanceAlerts.length === 1 ? (
    <Container fluid>
      <Row className="justify-content-center">
        <Col xs={colSize ? colSize : 8}>
          <AlertCard
            acceptAlert={acceptAlert}
            alert={guidanceAlerts[0]}
            minHeight={minHeight}
            rejectAlert={rejectAlert}
            created={createdAt}
          />
        </Col>
      </Row>
    </Container>
  ) : (
    <Alerts
      acceptAlert={acceptAlert}
      alerts={guidanceAlerts}
      minHeight={minHeight}
      rejectAlert={rejectAlert}
      created={createdAt}
    />
  );
};

export default GuidanceAlert;

export type AlertsProps = {
  alerts: AlertDefinition[];
  acceptAlert(alert: AlertDefinition): void;
  rejectAlert(params: RejectAlertPayload): Promise<RejectAlertResponse>;
  minHeight: string;
  created: Date;
};

function Alerts({
  alerts,
  acceptAlert,
  rejectAlert,
  minHeight,
  created = new Date(),
}: AlertsProps) {
  const [activeAlert, setActiveAlert] = useState<AlertDefinition>(alerts[0]);

  useEffect(() => {
    if (alerts && alerts.length > 0) {
      setActiveAlert(alerts[0]);
    }
  }, [alerts]);

  const [viewedAlertIds, setViewedAlertIds] = useState(
    new Set([activeAlert.resultId]),
  );

  return (
    <Container fluid className="guidance-alert-multi-container">
      <Row>
        <Col sm={4} lg={3} style={{ padding: 0 }}>
          <ListGroup className="mt-5">
            {alerts.map((alert) => (
              <ListGroup.Item
                key={alert.resultId}
                active={alert.resultId === activeAlert.resultId}
                onClick={() => {
                  setActiveAlert(alert);
                  setViewedAlertIds(
                    new Set([...viewedAlertIds, alert.resultId]),
                  );
                }}
                style={{ cursor: "pointer" }}
              >
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="pt-2 pe-2 guided-maroon"
                  beat={!viewedAlertIds.has(alert.resultId)}
                />
                {alert.title}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
        <Col style={{ paddingLeft: 0 }}>
          <MultiAlertCard
            key={activeAlert.resultId}
            acceptAlert={acceptAlert}
            alert={activeAlert}
            minHeight={minHeight}
            rejectAlert={rejectAlert}
            created={created}
          />
        </Col>
      </Row>
    </Container>
  );
}
