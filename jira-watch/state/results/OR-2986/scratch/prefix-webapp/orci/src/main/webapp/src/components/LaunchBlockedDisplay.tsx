import { Alert, Col, Container, Row } from "react-bootstrap";
import React from "react";
import { LaunchBlockedDTO } from "../types/ApplicationLaunchContext";

export function LaunchBlockedDisplay(props: { reason: LaunchBlockedDTO }) {
  return (
    <Container fluid className="h-100 position-absolute top-0">
      <Row className="justify-content-center align-items-center h-100">
        <Col xs sm="7">
          <Alert variant="secondary">
            <Alert.Heading>{props.reason.title}</Alert.Heading>
            <hr />
            <p>{props.reason.explanation}</p>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
}
