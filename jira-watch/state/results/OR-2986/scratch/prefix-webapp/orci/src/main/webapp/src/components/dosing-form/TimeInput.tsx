import { Ref, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "../../utils/FormatTime";
import { useHasClickedOutside } from "../../hooks/hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faRotate } from "@fortawesome/free-solid-svg-icons";
import { isEmpty } from "lodash";

export type TimeState = {
  day: string;
  month: string;
  year: string;
  hours: string;
  minutes: string;

  timeValuesAreValid: boolean;
  timeRangeIsValid: boolean;
  timeIsInTheFuture: boolean;
  get isValid(): boolean;
  get asDate(): Date;
};

export type TimeActions = {
  syncTime(): void;
  setTimeFromDate(date: Date): void;
  onHoursChanged(val: string): void;
  onMinutesChanged(val: string): void;
  onBlur(): void;
};

export type TimeRefs = {
  hoursInputRef: Ref<HTMLInputElement>;
  minutesInputRef: Ref<HTMLInputElement>;
};

export type TimeHook = {
  state: TimeState;
  refs: TimeRefs;
  actions: TimeActions;
  scanTime: Date;
};

export function useTimeInput(initialScanTime: Date): TimeHook {
  const scanTime = useRef(initialScanTime).current;
  const [day, setDay] = useState(() => formatTime(new Date().getDate()));
  // offset by 1 because JS is index-zero
  const [month, setMonth] = useState(() =>
    formatTime(new Date().getMonth() + 1),
  );
  const [year, setYear] = useState(() => formatTime(new Date().getFullYear()));

  // Reset date to scan time when user manually edits hours/minutes
  const resetDateToScanTime = useCallback(() => {
    setDay(formatTime(scanTime.getDate()));
    setMonth(formatTime(scanTime.getMonth() + 1));
    setYear(formatTime(scanTime.getFullYear()));
  }, [scanTime]);

  const hoursInputRef = useRef<HTMLInputElement>(null);
  const minutesInputRef = useRef<HTMLInputElement>(null);
  const [hours, setHours] = useState(() => formatTime(new Date().getHours()));
  const [minutes, setMinutes] = useState(() =>
    formatTime(new Date().getMinutes()),
  );

  const [timeValuesAreValid, setTimeValuesAreValid] = useState(false);
  const [timeRangeIsValid, setTimeRangeIsValid] = useState(false);
  const [timeIsInTheFuture, setTimeIsInTheFuture] = useState(false);

  const setTimeFromDate = useCallback((date: Date) => {
    setDay(formatTime(date.getDate()));
    setMonth(formatTime(date.getMonth() + 1));
    setYear(formatTime(date.getFullYear()));
    setHours(formatTime(date.getHours()));
    setMinutes(formatTime(date.getMinutes()));
  }, []);

  const date = useMemo(() => {
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
    );
  }, [day, hours, minutes, month, year]);

  /**
   * Validates the time values and range
   *
   * Values is with respect to a 24-clock.
   * Range is within 1 hour of present time
   */
  const validateTime = useCallback(() => {
    const now = new Date();
    const timeIsValid =
      !isEmpty(hours) &&
      !isEmpty(minutes) &&
      Number(hours) >= 0 &&
      Number(hours) <= 23 &&
      Number(minutes) >= 0 &&
      Number(minutes) <= 59;
    setTimeValuesAreValid(timeIsValid);
    if (timeIsValid) {
      // Assume the end of the minute
      const administrationTime = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        59,
        999,
      );
      const FIFTY_NINE_MINUTES_IN_MS = 1000 * 60 * 59;
      setTimeRangeIsValid(
        now.getTime() - administrationTime.getTime() <=
          FIFTY_NINE_MINUTES_IN_MS,
      );
    } else {
      setTimeRangeIsValid(false);
    }
    setTimeIsInTheFuture(date > now);
  }, [date, day, hours, minutes, month, year]);

  useEffect(() => {
    validateTime();
  }, [validateTime]);

  useEffect(() => {
    const interval = setInterval(validateTime, 1000);
    return () => clearInterval(interval);
  }, [validateTime]);

  return useMemo(
    () => ({
      state: {
        day,
        month,
        year,
        hours,
        minutes,
        timeValuesAreValid,
        timeRangeIsValid,
        timeIsInTheFuture,
        get isValid() {
          return timeValuesAreValid && timeRangeIsValid && !timeIsInTheFuture;
        },
        get asDate() {
          return date;
        },
      },
      refs: {
        hoursInputRef,
        minutesInputRef,
      },
      actions: {
        syncTime() {
          setTimeFromDate(new Date());
        },
        setTimeFromDate,
        onHoursChanged(val: string) {
          resetDateToScanTime();
          setHours(val);
        },
        onMinutesChanged(val: string) {
          resetDateToScanTime();
          setMinutes(val);
        },
        onBlur() {
          setHours(formatTime(hours.trim(), 2, 24));
          setMinutes(formatTime(minutes.trim(), 2, 60));
        },
      },
      scanTime,
    }),
    [
      date,
      day,
      hours,
      minutes,
      month,
      resetDateToScanTime,
      setTimeFromDate,
      timeIsInTheFuture,
      timeRangeIsValid,
      timeValuesAreValid,
      year,
    ],
  );
}

export function TimeInput({
  timeHook: { state, refs, actions, scanTime },
  inductionTime,
  usePresetDropdown = true,
}: {
  timeHook: TimeHook;
  inductionTime?: Date | null;
  usePresetDropdown?: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const { hasClickedOutside, reset } = useHasClickedOutside(containerRef);

  useEffect(() => {
    if (hasClickedOutside) {
      setShowDropdown(false);
      reset();
    }
  }, [hasClickedOutside, reset]);

  useEffect(() => {
    if (!showDropdown) {
      return;
    }
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [showDropdown]);

  const formatTimeLabel = useCallback((date: Date) => {
    return `${formatTime(date.getHours())}:${formatTime(date.getMinutes())}`;
  }, []);

  const formattedNow = formatTimeLabel(now);
  const formattedScan = formatTimeLabel(scanTime);

  const dropdownOptions = useMemo(() => {
    const formattedInduction = inductionTime
      ? formatTimeLabel(inductionTime)
      : null;

    const options: {
      label: string;
      time: Date;
      formatted: string;
      onClick: () => void;
    }[] = [
      {
        label: "Scan",
        time: scanTime,
        formatted: formattedScan,
        onClick: () => actions.setTimeFromDate(scanTime),
      },
    ];

    // Add Induction if it exists and has a different time than scan
    if (inductionTime && formattedInduction !== formattedScan) {
      options.push({
        label: "Induction",
        time: inductionTime,
        formatted: formattedInduction!,
        onClick: () => actions.setTimeFromDate(inductionTime),
      });
    }

    // Add Now if different time from scan and different from induction
    const nowDiffersFromScan = formattedNow !== formattedScan;
    const nowDiffersFromInduction =
      !inductionTime || formattedNow !== formattedInduction;
    if (nowDiffersFromScan && nowDiffersFromInduction) {
      options.push({
        label: "Now",
        time: now,
        formatted: "",
        onClick: () => actions.syncTime(),
      });
    }

    return options.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [
    actions,
    formattedNow,
    formattedScan,
    formatTimeLabel,
    inductionTime,
    now,
    scanTime,
  ]);

  return (
    <div
      className="time-input-container"
      ref={containerRef}
      style={{ position: "relative", display: "inline-flex", gap: "4px" }}
    >
      <input
        ref={refs.hoursInputRef}
        name="admin-hours"
        inputMode="numeric"
        className={`form-control ${
          state.timeValuesAreValid && !state.timeRangeIsValid ? "invalid" : ""
        }`}
        placeholder=""
        style={{ width: "80px", display: "inline-block" }}
        required={true}
        value={state.hours}
        onBlur={() => actions.onBlur()}
        onChange={(e) => {
          actions.onHoursChanged(e.target.value);
        }}
      />
      :
      <input
        ref={refs.minutesInputRef}
        name="admin-minutes"
        inputMode="numeric"
        className={`form-control ${
          state.timeValuesAreValid && !state.timeRangeIsValid ? "invalid" : ""
        }`}
        placeholder=""
        style={{ width: "80px", display: "inline-block" }}
        required={true}
        value={state.minutes}
        onBlur={() => actions.onBlur()}
        onChange={(e) => {
          actions.onMinutesChanged(e.target.value);
        }}
      />
      {usePresetDropdown ? (
        <>
          <button
            type="button"
            aria-label="select preset time"
            aria-expanded={showDropdown}
            className="time-input-toggle p-0 ms-1"
            onClick={() => {
              if (!showDropdown) {
                setNow(new Date());
              }
              setShowDropdown(!showDropdown);
            }}
            style={{ lineHeight: 1, cursor: "pointer", border: "none" }}
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </button>
          {showDropdown && (
            <div className="time-input-dropdown">
              {dropdownOptions.map((option) => (
                <button
                  type="button"
                  key={option.label}
                  className="time-input-dropdown__option"
                  onClick={() => {
                    option.onClick();
                    setShowDropdown(false);
                  }}
                >
                  <span>{option.label}</span>
                  <span className="time-input-dropdown__time">
                    {option.formatted}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <FontAwesomeIcon
          className="ms-2 pointer my-auto"
          icon={faRotate}
          onClick={actions.syncTime}
          aria-label="set to current time"
          title="set to current time"
        />
      )}
    </div>
  );
}
