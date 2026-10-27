import { TimelineEvent, useTimeline } from "./useTimeline";
import { DateTime, DateTimeUnit, DurationUnit, Interval } from "luxon";
import React, { useEffect, useMemo } from "react";
import { TimelineEventView } from "./TimelineEventView";
import { ArrowClockwise, AspectRatio } from "react-bootstrap-icons";
import { TimelineTick } from "./TimelineTick";
import { Filters } from "./Filters";

export type TimelineProps = {
  timelineEvents: TimelineEvent[];
  onEventSelected(ev: TimelineEvent): void;
  onViewportChange?: (min: DateTime, max: DateTime) => void;
  onReset?: () => void;
};

const units: DurationUnit[] = [
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
];

type TickPosition = {
  startPercent: number;
  endPercent: number;
  date: DateTime;
};

function calculateTickPositions(
  unit: DateTimeUnit,
  interval: Interval,
): TickPosition[] {
  if (!interval.start) return [];
  let cursor = interval.start.startOf(unit);
  const positions: TickPosition[] = [];

  do {
    const nextCursor = cursor.plus({ [unit]: 1 });
    const intervalLength = interval.length("second");

    const startPercent =
      cursor >= interval.start
        ? Interval.fromDateTimes(interval.start, cursor).length("second") /
          intervalLength
        : 0;

    const endPercent =
      Interval.fromDateTimes(interval.start, nextCursor).length("second") /
      intervalLength;

    positions.push({ startPercent, endPercent, date: cursor });
    cursor = nextCursor;
  } while (interval.contains(cursor));

  return positions;
}

export function Timeline({
  timelineEvents,
  onEventSelected,
  onViewportChange,
  onReset,
}: TimelineProps) {
  const timeline = useTimeline({
    initialEvents: timelineEvents,
  });

  // Use .valueOf() as deps so the effect only fires when the actual timestamp changes,
  // not just when Luxon creates new DateTime wrapper objects on each render.
  const minMs = timeline.min.valueOf();
  const maxMs = timeline.max.valueOf();
  useEffect(() => {
    onViewportChange?.(timeline.min, timeline.max);
    // onViewportChange intentionally omitted — always current via ref in parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minMs, maxMs]);

  const interval = Interval.fromDateTimes(timeline.min, timeline.max);
  const [primaryUnit, secondaryUnit] = useMemo(() => {
    for (let i = 1; i < units.length; i++) {
      if (interval.length(units[i]) > 1) {
        return [units[i - 1], units[i]];
      }
    }
    return ["year", "month"] as [DurationUnit, DurationUnit];
  }, [interval]);

  const tickPositionsPrimary = useMemo(() => {
    return calculateTickPositions(primaryUnit as DateTimeUnit, interval);
  }, [primaryUnit, interval]);

  const tickPositionsSecondary = useMemo(() => {
    return calculateTickPositions(secondaryUnit as DateTimeUnit, interval);
  }, [secondaryUnit, interval]);

  return (
    <div>
      <div className="d-flex position-absolute top-0 start-0 align-items-center">
        <span className="pointer border-end border-start px-2">
          <ArrowClockwise
            onClick={() => {
              timeline.reset();
              onReset?.();
            }}
            title="reset all"
            role="button"
          />
        </span>
        <span className="pointer border-end px-2">
          <AspectRatio
            onClick={() => timeline.reset()}
            title="reframe view"
            role="button"
          />
        </span>
        <Filters timeline={timeline} />
      </div>

      {/* event view */}
      <div
        style={{
          position: "absolute",
          left: "0",
          right: "0",
          top: "calc((1lh + 6px) * 2 + 30px)",
          bottom: "0",
          height: `calc(1lh * ${timeline.events.length})`,
          overflow: "hidden",
        }}
        ref={timeline.containerRef}
      >
        {timeline.events.map((timelineEvent, i) => (
          <TimelineEventView
            state={timeline}
            index={i}
            event={timelineEvent}
            key={i}
            onEventSelected={onEventSelected}
          />
        ))}
      </div>

      {/*Primary ticks*/}
      <div
        style={{
          position: "absolute",
          overflowX: "hidden",
          left: "0",
          right: "0",
          top: "30px",
          bottom: "0",
          height: `calc(1lh * ${timeline.events.length})`,
          pointerEvents: "none",
        }}
      >
        {tickPositionsPrimary.map((value, i) => (
          <TimelineTick
            key={i}
            primaryOrSecondary="primary"
            tick={value.date}
            percentStart={value.startPercent}
            percentEnd={value.endPercent}
            unit={primaryUnit}
          />
        ))}
      </div>

      {/*Secondary ticks*/}
      <div
        style={{
          position: "absolute",
          overflowX: "hidden",
          left: "0",
          right: "0",
          top: "calc(1lh + 6px + 30px)",
          bottom: "0",
          height: `calc(1lh * ${timeline.events.length})`,
          pointerEvents: "none",
        }}
      >
        {tickPositionsSecondary.map((value, i) => (
          <TimelineTick
            key={i}
            primaryOrSecondary="secondary"
            tick={value.date}
            percentStart={value.startPercent}
            percentEnd={value.endPercent}
            unit={secondaryUnit}
          />
        ))}
      </div>
    </div>
  );
}
