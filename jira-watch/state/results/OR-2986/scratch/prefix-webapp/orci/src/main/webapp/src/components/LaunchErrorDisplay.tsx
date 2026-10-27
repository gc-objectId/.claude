import { Alert, Button, Col, Container, Row } from "react-bootstrap";
import React, { useState } from "react";
import { isAxiosError } from "axios";
import { APIUnknownError } from "../errors/APIError";
import { Repeat } from "react-bootstrap-icons";
import { disableCloseDialog } from "../utils/windowControl";

export function LaunchErrorDisplay(props: {
  error: { e: Error; display: string };
}) {
  const [showDetails, setShowDetails] = useState(false);
  let traceId: string = "";
  let errorMessage = props.error.e.message;
  let detailedMessage: string = "";
  let isRetryable = false;
  if (isAxiosError(props.error.e)) {
    const headers = props.error.e.response?.headers;
    detailedMessage = props.error.e.response?.data?.message;
    if ([408, 504].includes(props.error.e.response?.status as number)) {
      detailedMessage = `${errorMessage} (${detailedMessage})`;
      errorMessage = "Request timed out";
      isRetryable = true;
    }
    traceId = headers && headers["x-trace-id"] ? headers["x-trace-id"] : "";
  } else {
    const apiError = props.error.e as APIUnknownError;
    traceId = apiError.headers["x-trace-id"]
      ? apiError.headers["x-trace-id"]
      : "";
    detailedMessage = apiError.data?.message;
    if ([408, 504].includes(apiError.status)) {
      detailedMessage = `${errorMessage} (${detailedMessage})`;
      errorMessage = "Request timed out";
      isRetryable = true;
    }
  }
  return (
    <Container fluid className="h-100 position-absolute top-0">
      <Row className="justify-content-center align-items-center h-100">
        <Col xs sm="7">
          <Alert variant="danger">
            <Alert.Heading>
              Unable to launch GuidedOR for this case
            </Alert.Heading>
            <hr />
            <p>{props.error.display}</p>
            <p>
              <i
                onClick={() => setShowDetails(!showDetails)}
                className="pointer link-primary"
              >
                {showDetails ? "hide details" : "show details"}
              </i>
            </p>
            {showDetails && (
              <div className="ms-2">
                <p>{errorMessage}</p>
                <p>{detailedMessage}</p>
              </div>
            )}
            {isRetryable && (
              <p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    disableCloseDialog();
                    window.location.replace(window.location.href);
                  }}
                >
                  Retry
                  <Repeat className="ms-1" />
                </Button>
              </p>
            )}
            {traceId && (
              <p>
                <small>Error ID: {traceId}</small>
              </p>
            )}
          </Alert>
        </Col>
      </Row>
    </Container>
  );
}
