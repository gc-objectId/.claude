import { DateTime, DurationUnit } from "luxon";
import React from "react";
import { getNumberWithOrdinal } from "../../utils/formatting";

export function TimelineTick({
  tick,
  percentStart,
  percentEnd,
  primaryOrSecondary,
  unit,
}: {
  tick: DateTime;
  percentStart: number;
  percentEnd: number;
  primaryOrSecondary: "primary" | "secondary";
  unit: DurationUnit;
}) {
  return (
    <div
      style={{
        height: "100%",
        position: "absolute",
        borderLeft: "1px dashed black",
        left: percentStart * 100 + "%",
        right: percentEnd ? `calc(100% - ${percentEnd * 100}%` : "unset",
        display: "inline-block",
      }}
      title={tick.toLocaleString(DateTime.TIME_WITH_SECONDS)}
    >
      <div
        style={{
          transformOrigin: "top left",
          whiteSpace: "nowrap",
          overflow: "visible",
          background: "white",
          padding: "3px",
          borderTop: "1px solid black",
          borderBottom: "1px solid black ",
          width: "100%",
          borderRight: "1px solid black",
        }}
      >
        {formatTime(tick, unit, primaryOrSecondary)}
      </div>
    </div>
  );
}

function formatTime(
  tick: DateTime,
  unit: DurationUnit,
  primaryOrSecondary: "primary" | "secondary",
) {
  function getDayMonthYear() {
    return (
      tick.toLocaleString({
        month: "long",
      }) +
      " " +
      getNumberWithOrdinal(tick.day) +
      ", " +
      tick.toLocaleString({
        year: "numeric",
      })
    );
  }

  switch (unit) {
    case "second":
      return primaryOrSecondary === "primary"
        ? getDayMonthYear()
        : tick.toLocaleString({
            second: "2-digit",
          });
    case "minute":
      return primaryOrSecondary === "primary"
        ? `${getDayMonthYear()} (seconds after ${tick.toLocaleString({
            hour: "2-digit",
            hour12: false,
            minute: "2-digit",
          })})`
        : tick.toLocaleString({
            minute: "2-digit",
          });
    case "hour":
      return primaryOrSecondary === "primary"
        ? `${getDayMonthYear()} (minutes after ${tick.toLocaleString({
            hour: "2-digit",
            hour12: false,
          })}:00)`
        : tick.toLocaleString({
            hour: "2-digit",
            hour12: false,
          }) + ":00";
    case "day":
      return primaryOrSecondary === "primary"
        ? getDayMonthYear()
        : getNumberWithOrdinal(tick.day);
    case "month":
      return primaryOrSecondary === "primary"
        ? tick.toLocaleString({
            month: "long",
            year: "numeric",
          })
        : tick.toLocaleString({
            month: "long",
          });
    case "year":
      return tick.toLocaleString({
        year: "numeric",
      });
    default:
      return unit;
  }
}
