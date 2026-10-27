import { TimelineEvent, TimelineHook } from "./useTimeline";
import React, {
  CSSProperties,
  DOMAttributes,
  PropsWithChildren,
  useState,
} from "react";
import { DateTime } from "luxon";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { FlagFill } from "react-bootstrap-icons";
import { TimelineProps } from "./Timeline";
import { TimelineEventIcon } from "./TimelineEventIcon";
import { useAppQueryParams } from "../../hooks/hooks";

type TimelineEventViewProps = {
  state: TimelineHook;
  event: TimelineEvent;
  index: number;
  onEventSelected: TimelineProps["onEventSelected"];
};

export function TimelineEventView({
  state,
  event,
  index,
  onEventSelected,
}: TimelineEventViewProps) {
  const totalLength = state.max.diff(state.min).toMillis();
  const { caseId } = useAppQueryParams();
  const edgeColor =
    event.caseId && event.caseId !== caseId
      ? "red"
      : !event.caseId
      ? "orange"
      : "black";

  if (event.type === "instantaneous") {
    const percentStart = event.date.diff(state.min).toMillis() / totalLength;
    return (
      <Track index={index} yOffset={state.yOffset}>
        <OverlayTrigger
          placement="right"
          delay={{ show: 250, hide: 400 }}
          flip={true}
          overlay={(props) => (
            <Tooltip id="button-tooltip" {...props}>
              {event.label}
              <br />
              {event.date.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)}
            </Tooltip>
          )}
        >
          {({ ref, ...triggerHandler }) => {
            return (
              <EventBarContainer
                percentStart={percentStart}
                backgroundColor="lightblue"
                edgeColor={edgeColor}
                onClick={() => onEventSelected(event)}
              >
                <div ref={ref} {...triggerHandler}>
                  <TimelineEventIcon icon={event.icon} />
                </div>
              </EventBarContainer>
            );
          }}
        </OverlayTrigger>
      </Track>
    );
  } else {
    const percentStart =
      event.startDate.diff(state.min).toMillis() / totalLength;
    const percentEnd = event.endDate.diff(state.min).toMillis() / totalLength;
    return (
      <Track index={index} yOffset={state.yOffset}>
        <OverlayTrigger
          placement="right"
          delay={{ show: 250, hide: 400 }}
          flip={true}
          overlay={(props) => (
            <Tooltip id="button-tooltip" {...props}>
              {event.label}
              <br />
              {event.endDate.diff(event.startDate).rescale().toHuman()}
              <br />
              {event.startDate.toLocaleString(
                DateTime.TIME_WITH_SECONDS,
              )} - {event.endDate.toLocaleString(DateTime.TIME_WITH_SECONDS)}
            </Tooltip>
          )}
        >
          {({ ref, ...triggerHandler }) => (
            <EventBarContainer
              percentStart={percentStart}
              percentEnd={percentEnd}
              backgroundColor="lightpink"
              edgeColor={edgeColor}
              onClick={() => onEventSelected(event)}
            >
              <div ref={ref} {...triggerHandler}>
                <FlagFill />
              </div>
            </EventBarContainer>
          )}
        </OverlayTrigger>
      </Track>
    );
  }
}

function Track({
  children,
  index,
  yOffset,
}: PropsWithChildren & { index: number; yOffset?: number }) {
  const [isHover, setIsHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onDragStart={() => false}
      onDrop={() => false}
      style={{
        position: "absolute",
        left: "0",
        right: "0",
        borderTop: index == 0 ? "1px solid black" : "",
        borderBottom: "1px solid black",
        top: `calc(${yOffset}px + ${index}lh)`,
        background:
          index % 2 == 0
            ? isHover
              ? "rgba(255,255,0,0.085)"
              : "rgba(0,0,0,0.035)"
            : isHover
            ? "rgba(255,255,0,0.085)"
            : "white",
        height: "1lh",
      }}
    >
      {children}
    </div>
  );
}

function EventBarContainer({
  percentStart,
  percentEnd,
  edgeColor = "black",
  children,
  backgroundColor,
  onClick,
}: PropsWithChildren & {
  percentStart: number;
  percentEnd?: number;
  edgeColor: CSSProperties["color"];
  backgroundColor: CSSProperties["backgroundColor"];
  onClick?: DOMAttributes<HTMLDivElement>["onClick"];
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: percentStart * 100 + "%",
        right: percentEnd ? `calc(100% - ${percentEnd * 100}%` : "unset",
        background: backgroundColor,
        borderLeft:
          percentEnd == null
            ? `2px solid ${edgeColor}`
            : `1px solid ${edgeColor}`,
        borderRight:
          percentEnd == null ? "1px dashed black" : "1px solid black",
        paddingLeft: "12px",
        paddingRight: "12px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        top: 0,
        bottom: 0,
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
