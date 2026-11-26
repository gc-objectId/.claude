import { Button } from "react-bootstrap";
import { Interstitial } from "./Interstitial";
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
    <Interstitial title="Unable to launch GuidedOR for this case" tone="danger">
      <p>{props.error.display}</p>
      <Button
        variant="link"
        className="interstitial__details"
        aria-expanded={showDetails}
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? "Hide details" : "Show details"}
      </Button>
      {showDetails && (
        <div className="interstitial__detail-text">
          <p>{errorMessage}</p>
          <p>{detailedMessage}</p>
        </div>
      )}
      {isRetryable && (
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
      )}
      {traceId && <p className="interstitial__meta">Error ID: {traceId}</p>}
    </Interstitial>
  );
}
