import { EventIcon } from "./useTimeline";
import {
  Capsule,
  Trash3Fill,
  EnvelopeFill,
  ExclamationTriangleFill,
  FlagFill,
  Mailbox2,
  RocketTakeoffFill,
} from "react-bootstrap-icons";
import React from "react";

const INTERNAL_MED_ADMIN_COLOR = "var(--guided-color-chart-series-5)";
const EXTERNAL_MED_ADMIN_COLOR = "var(--guided-color-chart-series-1)";

export function TimelineEventIcon({ icon }: { icon: EventIcon | undefined }) {
  return (
    <>
      {icon === EventIcon.TenantTimingEvent ? (
        <Mailbox2 />
      ) : icon === EventIcon.OrciTimingEvent ? (
        <EnvelopeFill />
      ) : icon === EventIcon.MedAdminInternal ? (
        <Capsule style={{ color: INTERNAL_MED_ADMIN_COLOR }} />
      ) : icon === EventIcon.MedAdminExternal ? (
        <Capsule style={{ color: EXTERNAL_MED_ADMIN_COLOR }} />
      ) : icon === EventIcon.MedAdminExternalCancel ? (
        <Trash3Fill style={{ color: EXTERNAL_MED_ADMIN_COLOR }} />
      ) : icon === EventIcon.Alert ? (
        <ExclamationTriangleFill />
      ) : icon === EventIcon.AppLaunch ? (
        <RocketTakeoffFill />
      ) : (
        <FlagFill />
      )}
    </>
  );
}

export function getIcon(eventType: string): EventIcon {
  if (eventType.toLowerCase().startsWith("orci-event/event-category")) {
    return EventIcon.OrciTimingEvent;
  }
  if (eventType.toLowerCase().startsWith("mgb-event/phs ext or timing event")) {
    return EventIcon.TenantTimingEvent;
  }
  if (eventType.toLowerCase().startsWith("mgb-event/med admin")) {
    if (eventType.toLowerCase().includes("- cancel")) {
      return EventIcon.MedAdminExternalCancel;
    } else {
      return EventIcon.MedAdminExternal;
    }
  }
  if (eventType.toLowerCase().startsWith("med-admin")) {
    return EventIcon.MedAdminInternal;
  }
  if (eventType.toLowerCase().startsWith("rule-fired")) {
    return EventIcon.Alert;
  }
  if (eventType.toLowerCase() === "app-launch") {
    return EventIcon.AppLaunch;
  }
  return EventIcon.Generic;
}
