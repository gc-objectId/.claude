import { useWebsocketSubscription } from "../../../../context/WebsocketContext";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IMessage } from "@stomp/stompjs/src/i-message";
import { Timeline } from "../../../Timeline/Timeline";
import { TimelineEvent } from "../../../Timeline/useTimeline";
import { DateTime } from "luxon";
import { EventNotification } from "../../../../types/EventNotification";
import {
  Alert,
  Container,
  Dropdown,
  Form,
  Modal,
  Spinner,
} from "react-bootstrap";
import {
  isLoaded,
  isLoading,
  Loadable,
  loading,
} from "../../../../types/Loadable";
import { getIcon } from "../../../Timeline/TimelineEventIcon";
import { Pencil } from "react-bootstrap-icons";
import {
  CaseId,
  DebugTimelineController,
  TimelineEvent as TimelineEventDto,
} from "@api";
import { XmlOrRawDisplay } from "./XmlOrRawDisplay";
import { deriveTenantId } from "../../../../utils/tenant";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";

import { logger } from "../../../../utils/logger";
export type NotificationTabProps = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

type PresetId = "last-hour" | "last-24h" | "last-7d" | "all-events" | "custom";

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "last-hour", label: "Last hour" },
  { id: "last-24h", label: "Last 24 hours" },
  { id: "last-7d", label: "Last 7 days" },
];

const PRESET_LABELS: Record<PresetId, string> = {
  "last-hour": "Last hour",
  "last-24h": "Last 24 hours",
  "last-7d": "Last 7 days",
  "all-events": "All events",
  custom: "Custom range",
};

const RELATIVE_PRESET_OFFSETS: Partial<
  Record<PresetId, Parameters<DateTime["minus"]>[0]>
> = {
  "last-hour": { hours: 1 },
  "last-24h": { hours: 24 },
  "last-7d": { days: 7 },
};

export function TimelineTab({ context, isActive }: NotificationTabProps) {
  const tenantId = deriveTenantId();
  const patientId = context.patient.pmrn;
  const caseId = context.operation.caseId;

  const [events, setEvents] = useState<Loadable<TimelineEventDto[]>>(loading());
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(
    null,
  );
  const [preset, setPreset] = useState<PresetId>("last-7d");
  const [customStart, setCustomStart] = useState<DateTime>(() =>
    DateTime.now().minus({ days: 7 }),
  );
  const [customEnd, setCustomEnd] = useState<DateTime | "now">("now");

  useEffect(() => {
    if (!isActive) return;
    DebugTimelineController.getEvents({
      path: {
        caseId,
        patientId,
      },
    }).then((it) => {
      if (it.data) {
        setEvents(it.data);
      }
    });
  }, [caseId, patientId, isActive]);

  const onMessage = useCallback((data: IMessage) => {
    logger.debug("received websocket notification message:", data.body);
    const parsedBody = JSON.parse(data.body);
    const result = EventNotification.validate(parsedBody);
    if (result.success) {
      // @ts-ignore fixme: api generates optional fields with ?, meaning string | undefined, but actual type is string | null
      setEvents((prevState) =>
        isLoaded(prevState) ? [...prevState, result.value] : prevState,
      );
    } else {
      console.error(
        "validation failed for websocket notification message",
        result.code,
        result.details,
      );
    }
  }, []);

  useWebsocketSubscription(
    isActive ? `admin/notifications/${tenantId}/${patientId}` : "",
    onMessage,
  );

  const switchToCustom = useCallback(() => {
    const offset = RELATIVE_PRESET_OFFSETS[preset];
    if (offset) {
      setCustomStart(DateTime.now().minus(offset));
      setCustomEnd("now");
    }
    setPreset("custom");
  }, [preset]);

  const allTimelineEvents = useMemo(() => {
    return isLoading(events)
      ? []
      : events.map((e) => eventNotificationToTimelineEvent(e, caseId));
  }, [events, caseId]);

  const filteredTimelineEvents = useMemo(() => {
    let start: DateTime | null = null;
    let end: DateTime | "now" = "now";

    if (preset === "last-hour") {
      start = DateTime.now().minus({ hours: 1 });
    } else if (preset === "last-24h") {
      start = DateTime.now().minus({ hours: 24 });
    } else if (preset === "last-7d") {
      start = DateTime.now().minus({ days: 7 });
    } else {
      // "all-events" and "custom" both use the stored custom bounds
      start = customStart;
      end = customEnd;
    }

    return allTimelineEvents.filter((e) => {
      const t = e.type === "span" ? e.startDate : e.date;
      if (start && t < start) return false;
      if (end !== "now" && t > end) return false;
      return true;
    });
  }, [allTimelineEvents, preset, customStart, customEnd]);

  // After we auto-expand the filter, useTimeline rebuilds and fires onViewportChange
  // once more with the new viewport. Skip that one reactive call to prevent cascades.
  const skipNextViewportChangeRef = useRef(false);

  const handleViewportChange = useCallback(
    (min: DateTime, max: DateTime) => {
      if (skipNextViewportChangeRef.current) {
        skipNextViewportChangeRef.current = false;
        return;
      }

      // Compute the effective filter bounds for the active preset
      let effectiveStart: DateTime | null = null;
      let effectiveEnd: DateTime | "now" = "now";
      if (preset === "last-hour") {
        effectiveStart = DateTime.now().minus({ hours: 1 });
      } else if (preset === "last-24h") {
        effectiveStart = DateTime.now().minus({ hours: 24 });
      } else if (preset === "last-7d") {
        effectiveStart = DateTime.now().minus({ days: 7 });
      } else {
        effectiveStart = customStart;
        effectiveEnd = customEnd;
      }

      // Events within the new viewport that the current filter is hiding
      const newlyVisible = allTimelineEvents.filter((e) => {
        const t = e.type === "span" ? e.startDate : e.date;
        if (t < min || t > max) return false;
        if (
          effectiveStart !== null &&
          t >= effectiveStart &&
          (effectiveEnd === "now" || t <= effectiveEnd)
        )
          return false;
        return true;
      });

      if (newlyVisible.length === 0) return;

      // Expand bounds to include newly visible events
      let newStart = effectiveStart;
      let newEnd: DateTime | "now" = effectiveEnd;
      for (const e of newlyVisible) {
        const t = e.type === "span" ? e.startDate : e.date;
        const tEnd = e.type === "span" ? e.endDate : e.date;
        if (newStart === null || t < newStart) newStart = t;
        if (newEnd !== "now" && tEnd > newEnd) newEnd = tEnd;
      }

      skipNextViewportChangeRef.current = true;
      if (newStart !== null) setCustomStart(newStart);
      setCustomEnd(newEnd);
      setPreset("custom");
    },
    [preset, customStart, customEnd, allTimelineEvents],
  );

  const fullExtents = useMemo(() => {
    if (allTimelineEvents.length === 0) return null;
    let min = DateTime.now().plus({ years: 100 });
    let max = DateTime.fromMillis(0);
    for (const e of allTimelineEvents) {
      const start = e.type === "span" ? e.startDate : e.date;
      const end = e.type === "span" ? e.endDate : e.date;
      if (start < min) min = start;
      if (end > max) max = end;
    }
    return { min, max };
  }, [allTimelineEvents]);

  return isLoading(events) ? (
    <div>
      <Spinner />
      loading...
    </div>
  ) : !events || events.length === 0 ? (
    <div>No events to display</div>
  ) : events.length === 1 ? (
    <div>
      <div>Only event:</div>
      <div>
        {events[0].displayName} @{" "}
        {DateTime.fromISO(events[0].startTime).toLocaleString(
          DateTime.DATETIME_SHORT_WITH_SECONDS,
        )}
      </div>
      <div>(need more than one event to display timeline)</div>
    </div>
  ) : (
    <div>
      <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
        <span className="text-muted small fw-semibold">Time range:</span>
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" size="sm">
            {PRESET_LABELS[preset]}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {PRESETS.map(({ id, label }) => (
              <Dropdown.Item
                key={id}
                active={preset === id}
                onClick={() => setPreset(id)}
              >
                {label}
              </Dropdown.Item>
            ))}
            <Dropdown.Divider />
            {fullExtents && (
              <Dropdown.Item
                active={preset === "all-events"}
                onClick={() => {
                  setCustomStart(fullExtents.min);
                  setCustomEnd("now");
                  setPreset("all-events");
                }}
              >
                All events
              </Dropdown.Item>
            )}
            <Dropdown.Item
              active={preset === "custom"}
              onClick={switchToCustom}
            >
              Custom range
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        {preset !== "custom" && preset !== "all-events" && (
          <Pencil
            role="button"
            title="Customize range"
            className="text-muted"
            style={{ cursor: "pointer" }}
            onClick={switchToCustom}
          />
        )}

        {(preset === "all-events" || preset === "custom") && (
          <>
            <Form.Control
              type="datetime-local"
              size="sm"
              style={{ width: "auto" }}
              value={customStart.toLocal().toFormat("yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => {
                if (e.target.value)
                  setCustomStart(DateTime.fromISO(e.target.value));
              }}
            />
            <span className="text-muted">–</span>
            {customEnd === "now" ? (
              <Form.Control
                size="sm"
                style={{ width: "auto", cursor: "pointer" }}
                value="Now"
                readOnly
                onClick={() => setCustomEnd(fullExtents?.max ?? DateTime.now())}
              />
            ) : (
              <Form.Control
                type="datetime-local"
                size="sm"
                style={{ width: "auto" }}
                value={customEnd.toLocal().toFormat("yyyy-MM-dd'T'HH:mm")}
                onChange={(e) =>
                  setCustomEnd(
                    e.target.value ? DateTime.fromISO(e.target.value) : "now",
                  )
                }
              />
            )}
          </>
        )}

        <span className="text-muted small">
          Showing{" "}
          <strong>
            {filteredTimelineEvents.length} of {allTimelineEvents.length}
          </strong>{" "}
          events
        </span>
      </div>

      <div style={{ minHeight: "300px", position: "relative" }}>
        <Timeline
          timelineEvents={filteredTimelineEvents}
          onEventSelected={(event) => setSelectedEvent(event)}
          onViewportChange={handleViewportChange}
          onReset={() => setPreset("last-7d")}
        />
      </div>

      <Modal
        onHide={() => setSelectedEvent(null)}
        show={selectedEvent != null}
        size="lg"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Event details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container fluid="md">
            {selectedEvent?.caseId !== caseId && (
              <Alert variant="warning">
                {selectedEvent?.caseId ? (
                  <div>
                    Case ID mismatch (event caseID: {selectedEvent?.caseId},
                    current caseID: {caseId})
                  </div>
                ) : (
                  <div>Selected event not associated with a case</div>
                )}
              </Alert>
            )}
            <pre>category: {selectedEvent?.category}</pre>
            {selectedEvent?.data && (
              <XmlOrRawDisplay data={selectedEvent.data} />
            )}
          </Container>
        </Modal.Body>

        <Modal.Footer></Modal.Footer>
      </Modal>
    </div>
  );
}

function eventNotificationToTimelineEvent(
  e: TimelineEventDto,
  caseId: CaseId,
): TimelineEvent {
  if (e.endTime) {
    return {
      type: "span",
      id: e.id,
      label: e.displayName,
      startDate: DateTime.fromISO(e.startTime),
      endDate: DateTime.fromISO(e.endTime),
      data: e.body,
      category: e.eventType,
      icon: getIcon(e.eventType),
      caseId: e.caseId,
    };
  }
  return {
    type: "instantaneous",
    id: e.id,
    label: e.displayName,
    date: DateTime.fromISO(e.startTime),
    data: e.body,
    category: e.eventType,
    icon: getIcon(e.eventType),
    caseId: e.caseId,
  };
}
