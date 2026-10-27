import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { useNow } from "../../hooks/hooks";
import React, { useMemo } from "react";
import { DateTime } from "luxon";

import { AlertDefinition } from "../../types/AlertDefinition";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../types/User";

export type AlertHeaderProps = {
  alert: AlertDefinition;
  created: Date;
};

export function AlertHeader({ alert, created }: AlertHeaderProps) {
  const now = useNow();
  const { user } = useAuth();
  const userIsAdmin = isAdmin(user);
  const relativeTime = useMemo(() => formatTime(created, now), [created, now]);

  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between">
        <div>
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="pt-2 pe-2 guided-maroon"
            beat
            size="2x"
          />
          <OverlayTrigger
            placement="right"
            overlay={<Tooltip>{alert?.ruleIdentifier}</Tooltip>}
            trigger={userIsAdmin ? ["hover", "focus"] : []}
          >
            <h3
              className="d-inline"
              data-testid={alert?.ruleIdentifier + "-title"}
            >
              {alert?.title}
            </h3>
          </OverlayTrigger>
        </div>
        <span className="mt-auto text-nowrap">{relativeTime}</span>
      </div>
    </div>
  );
}

const formatTime = (start: Date, end: Date) => {
  const diffInMinutes = DateTime.fromJSDate(end).diff(
    DateTime.fromJSDate(start),
    "minutes",
  );
  const minutes = Number(diffInMinutes.minutes.toFixed(0)) % 60;
  const hours = Number((diffInMinutes.minutes / 60).toFixed(0));
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(hours + " h");
  }

  if (minutes > 0) {
    parts.push(minutes + " min");
  }

  if (parts.length > 0) parts.push("ago");

  return parts.join(" ");
};
