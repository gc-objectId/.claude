import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  clamp,
  differenceWith,
  get,
  isEqual,
  isString,
  merge,
  set,
  sortBy,
  uniq,
} from "lodash";
import { DateTime, Duration } from "luxon";
import { useMousePosition } from "../../hooks/useMousePosition";
import { CaseId } from "@api";

export type TimelineConfig = {
  initialEvents: TimelineEvent[];
};

export enum EventIcon {
  MedAdminInternal,
  MedAdminExternal,
  MedAdminExternalCancel,
  TenantTimingEvent,
  OrciTimingEvent,
  Alert,
  AppLaunch,
  Generic,
}

export type TimelineEvent =
  | {
      type: "instantaneous";
      id: string;
      date: DateTime;
      label: string | ReactElement;
      data?: any;
      icon?: EventIcon;
      caseId?: CaseId;
      category: string;
    }
  | {
      type: "span";
      id: string;
      startDate: DateTime;
      endDate: DateTime;
      label: string | ReactElement;
      data?: any;
      icon?: EventIcon;
      caseId?: CaseId;
      category: string;
    };

function sortedEvents(events: TimelineEvent[]): TimelineEvent[] {
  return sortBy(events, (ev) => (ev.type === "span" ? ev.startDate : ev.date));
}

const addEvent = (
  state: TimelineState,
  event: TimelineEvent,
): TimelineState => {
  let _min = state.min;
  let _max = state.max;
  if (event.type === "instantaneous") {
    if (isString(event.date)) {
      // @ts-ignore
      event.date = DateTime.fromISO(event.date as string);
    }
    const eventTime = event.date;
    if (eventTime < _min) {
      _min = eventTime;
    }
    if (eventTime > _max) {
      _max = eventTime;
    }
  } else if (event.type === "span") {
    if (isString(event.startDate)) {
      // @ts-ignore
      event.startDate = DateTime.fromISO(event.startDate as string);
    }
    if (isString(event.endDate)) {
      // @ts-ignore
      event.endDate = DateTime.fromISO(event.endDate as string);
    }
    if (event.startDate > event.endDate) {
      console.warn("attempted to add span timeline event with start after end");
      return state;
    }
    if (event.startDate < _min) {
      _min = event.startDate;
    }
    if (event.endDate > _max) {
      _max = event.endDate;
    }
  }
  const newTimespanSeconds = _max.diff(_min).as("seconds");
  if (newTimespanSeconds <= 1) {
    // don't auto-zoom past the max zoom
    const correction = (1 - newTimespanSeconds) / 2;
    _max = _max.plus({ second: correction });
    _min = _min.minus({ second: correction });
  }
  return {
    ...state,
    min: _min,
    max: _max,
    originalMin: _min,
    originalMax: _max,
    events: sortedEvents([...state.events, event]),
  };
};

export type EventTypeFilter =
  | boolean
  | {
      [key: string]: EventTypeFilter;
    };

type TimelineState = {
  events: TimelineEvent[];
  min: DateTime;
  max: DateTime;
  yOffset: number;
  originalMin: DateTime;
  originalMax: DateTime;
};

const emptyState: TimelineState = {
  events: [],
  min: DateTime.now().plus(Duration.fromObject({ years: 10 })), // hope we don't need to show events > 10 years into the future...
  max: DateTime.fromMillis(0),
  yOffset: 0,
  originalMin: DateTime.now().plus(Duration.fromObject({ years: 10 })),
  originalMax: DateTime.fromMillis(0),
};

export type TimelineHook = {
  min: DateTime;
  max: DateTime;
  events: TimelineEvent[];
  filter: EventTypeFilter;
  setFilter(filter: EventTypeFilter): void;
  reset(): void;
  containerRef: (el: HTMLDivElement) => void;
  yOffset: number;
};

export function useTimeline(config: TimelineConfig): TimelineHook {
  const [filter, setFilter] = useState<EventTypeFilter>(() =>
    makeFilterTree(config.initialEvents.map((value) => value.category)),
  );

  const [state, setState] = useState<TimelineState>(emptyState);
  const mousePosition = useMousePosition();

  useEffect(() => {
    setFilter((prevFilter) => {
      const newFilter = makeFilterTree(
        config.initialEvents.map((value) => value.category),
      );
      // add any new categories to the filter
      // order matters here: merge prioritizes the right-hand-side, so we preserve the existing filter values
      return merge(newFilter, prevFilter);
    });

    setState((p) => {
      const diff = differenceWith(config.initialEvents, p.events, isEqual);
      const removed = differenceWith(p.events, config.initialEvents, isEqual);
      if (diff.length == 0 && removed.length == 0) return p;
      return config.initialEvents.reduce(
        (acc, x) => addEvent(acc, x),
        emptyState,
      );
    });
  }, [config.initialEvents]);

  const [containerElement, setContainerElement] = useState<HTMLDivElement>();

  const onZoom = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const wheelTicks = event.deltaY;
      setState((prevState) => {
        if (!(mousePosition != null && containerElement != null)) {
          return prevState;
        }
        let bounds = containerElement.getBoundingClientRect();
        let relativeX = mousePosition.x - bounds.left;
        const width = containerElement.clientWidth;
        const left = clamp(relativeX / width, 0, 1);
        const right = 1 - left;

        const duration = prevState.min.diff(prevState.max).rescale();

        // 0.1% of the total duration per mouse tick
        const percentOfTotalTimePerMouseWheelTick = 0.001;
        const buffer = duration.mapUnits(
          (x) => x * percentOfTotalTimePerMouseWheelTick * wheelTicks,
        );
        // distribute zoom proportionally between min and max depending on mouse x
        const newMin = prevState.min.minus(buffer.mapUnits((x) => x * left));
        const newMax = prevState.max.plus(buffer.mapUnits((x) => x * right));
        const newTimespanSeconds = newMax.diff(newMin).as("seconds");

        // maximum zoom reached
        if (newTimespanSeconds <= 1 && wheelTicks > 0) {
          return prevState;
        }

        return { ...prevState, min: newMin, max: newMax };
      });
    },
    [containerElement, mousePosition],
  );

  const onPan = useCallback(
    (ev: MouseEvent) => {
      const movementX = ev.movementX;
      const movementY = ev.movementY;
      setState((prevState) => {
        if (containerElement == null) return prevState;
        const width = containerElement.clientWidth;
        const secondsPerPixel =
          prevState.max.diff(prevState.min).as("seconds") / width;
        const secondsDragged = movementX * secondsPerPixel;
        const panAmount = Duration.fromObject({ seconds: secondsDragged });
        const newMin = prevState.min.minus(panAmount);
        const newMax = prevState.max.minus(panAmount);
        let newYOffset = prevState.yOffset + movementY;
        return { ...prevState, min: newMin, max: newMax, yOffset: newYOffset };
      });
    },
    [containerElement],
  );

  const [isMouseDown, setIsMouseDown] = useState(false);

  const onMouseDown = useCallback(() => {
    setIsMouseDown(true);
  }, []);

  const onMouseUp = useCallback(() => {
    setIsMouseDown(false);
  }, []);

  const onMouseMove = useCallback(
    (ev: MouseEvent) => {
      if (isMouseDown) {
        onPan(ev);
      }
    },
    [isMouseDown, onPan],
  );

  useEffect(() => {
    const ref = containerElement;
    ref?.addEventListener("wheel", onZoom, { passive: false });
    ref?.addEventListener("mousedown", onMouseDown);
    ref?.addEventListener("mouseup", onMouseUp);
    ref?.addEventListener("mousemove", onMouseMove);
    return () => {
      ref?.removeEventListener("wheel", onZoom);
      ref?.removeEventListener("mousedown", onMouseDown);
      ref?.removeEventListener("mouseup", onMouseUp);
      ref?.removeEventListener("mousemove", onMouseMove);
    };
  }, [containerElement, onMouseDown, onMouseMove, onMouseUp, onZoom]);

  const refSetter = useCallback((val: HTMLDivElement) => {
    setContainerElement(val);
  }, []);

  const reset = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      max: prevState.originalMax,
      min: prevState.originalMin,
      yOffset: 0,
    }));
    setFilter(
      makeFilterTree(config.initialEvents.map((value) => value.category)),
    );
  }, [config.initialEvents]);

  const buffer = useMemo(
    () =>
      state.max
        .diff(state.min)
        .rescale() // add 5% on either end of the time range
        .mapUnits((x) => x * 0.05),
    [state.max, state.min],
  );

  return {
    min: state.min.minus(buffer),
    max: state.max.plus(buffer),
    events: state.events.filter((it) => matchesFilter(it, filter)),
    containerRef: refSetter,
    yOffset: state.yOffset,
    filter,
    setFilter(filter) {
      setFilter(filter);
      setState((s) => ({ ...s, yOffset: 0 }));
    },
    reset,
  };
}

function matchesFilter(event: TimelineEvent, filter: EventTypeFilter): boolean {
  const path = event.category.split("/");
  return get(filter, path, true);
}

function makeFilterTree(slashSeparatedCategories: string[]): EventTypeFilter {
  const categories = uniq(slashSeparatedCategories).map((x) => x.split("/"));
  const filterTree: EventTypeFilter = {};
  categories.forEach((category) => {
    set(filterTree, category, true);
  });
  return filterTree;
}
