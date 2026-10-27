import React, { useMemo } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { DateTime } from "luxon";

export interface TimeSeriesDataPoint<T = any> {
  time: Date;
  value: number;
  data?: T; // Optional additional data for tooltips
}

export interface TimeSeriesGraphProps<T = any> {
  /** Data points to plot */
  points: TimeSeriesDataPoint<T>[];
  /** Width of the graph in pixels */
  width?: number;
  /** Height of the graph in pixels */
  height?: number;
  /** Unit label for the Y-axis */
  yAxisLabel: string;
  /** Optional function to format tooltip content */
  formatTooltip?: (point: TimeSeriesDataPoint<T>) => React.ReactNode;
  /** Whether to show grid lines */
  showGrid?: boolean;
  /** Line color */
  lineColor?: string;
  /** Point color - can be a string or a function that returns a color based on the point */
  pointColor?: string | ((point: TimeSeriesDataPoint<T>) => string);
  /** Line style - 'line' for connected lines, 'step' for step function */
  lineStyle?: "line" | "step";
  /** Optional time range override */
  timeRange?: { start: Date; end: Date };
  /** Optional value range override (min, max) */
  valueRange?: { min: number; max: number };
}

export function TimeSeriesGraph<T = any>({
  points,
  width = 500,
  height = 150,
  yAxisLabel,
  formatTooltip,
  showGrid = true,
  lineColor = "#0d6efd",
  pointColor,
  lineStyle = "line",
  timeRange,
  valueRange,
}: TimeSeriesGraphProps<T>) {
  const padding = { top: 10, right: 40, bottom: 30, left: 60 };

  const {
    sortedPoints,
    calculatedTimeRange,
    calculatedValueRange,
    decimalPlaces,
  } = useMemo(() => {
    const sorted = [...points].sort(
      (a, b) => a.time.getTime() - b.time.getTime(),
    );

    let calcTimeRange = timeRange || {
      start: sorted[0]?.time || new Date(),
      end: sorted[sorted.length - 1]?.time || new Date(),
    };

    // Handle single point case: add padding around the point
    if (
      !timeRange &&
      calcTimeRange.start.getTime() === calcTimeRange.end.getTime()
    ) {
      const centerTime = calcTimeRange.start.getTime();
      const padding = 60 * 60 * 1000; // 1 hour padding on the right
      calcTimeRange = {
        start: new Date(centerTime),
        end: new Date(centerTime + padding),
      };
    }

    let calcValueRange = valueRange;
    if (!calcValueRange) {
      const values = sorted.map((p) => p.value);
      const minValue = Math.min(...values, 0);
      const maxValue = Math.max(...values);
      calcValueRange = { min: minValue, max: maxValue };
    }

    // Calculate appropriate decimal places based on value range
    const range = calcValueRange.max - calcValueRange.min;
    let decimals = 1; // default
    if (range === 0) {
      // Single value - use precision based on magnitude
      const absValue = Math.abs(calcValueRange.max);
      if (absValue < 0.01) decimals = 5;
      else if (absValue < 0.1) decimals = 4;
      else if (absValue < 1) decimals = 3;
      else if (absValue < 10) decimals = 2;
      else if (absValue < 100) decimals = 1;
      else decimals = 0;
    } else if (range < 0.01) {
      decimals = 5;
    } else if (range < 0.1) {
      decimals = 4;
    } else if (range < 1) {
      decimals = 3;
    } else if (range < 10) {
      decimals = 2;
    } else if (range < 100) {
      decimals = 1;
    } else {
      decimals = 0;
    }

    return {
      sortedPoints: sorted,
      calculatedTimeRange: calcTimeRange,
      calculatedValueRange: calcValueRange,
      decimalPlaces: decimals,
    };
  }, [points, timeRange, valueRange]);

  const xScale = (time: Date) => {
    const totalDuration =
      calculatedTimeRange.end.getTime() - calculatedTimeRange.start.getTime();
    const timeOffset = time.getTime() - calculatedTimeRange.start.getTime();
    return (
      padding.left +
      (timeOffset / totalDuration) * (width - padding.left - padding.right)
    );
  };

  const yScale = (value: number) => {
    const range = calculatedValueRange.max - calculatedValueRange.min;
    return (
      height -
      padding.bottom -
      ((value - calculatedValueRange.min) / range) *
        (height - padding.top - padding.bottom)
    );
  };

  const scaledPoints = sortedPoints.map((point) => ({
    x: xScale(point.time),
    y: yScale(point.value),
    ...point,
  }));

  const pathData = useMemo(() => {
    if (scaledPoints.length === 0) return "";

    if (lineStyle === "step") {
      return scaledPoints.reduce((path, point, index) => {
        if (index === 0) {
          return `M ${point.x} ${point.y}`;
        }
        const prevPoint = scaledPoints[index - 1];
        // Create step function: horizontal line to new time, then vertical line to new value
        return path + ` L ${point.x} ${prevPoint.y} L ${point.x} ${point.y}`;
      }, "");
    } else {
      // Line style - direct connections between points
      return scaledPoints.reduce((path, point, index) => {
        if (index === 0) {
          return `M ${point.x} ${point.y}`;
        }
        return path + ` L ${point.x} ${point.y}`;
      }, "");
    }
  }, [scaledPoints, lineStyle]);

  const defaultFormatTooltip = (point: TimeSeriesDataPoint<T>) => (
    <div style={{ whiteSpace: "pre-line", textAlign: "left" }}>
      {DateTime.fromJSDate(point.time).toLocaleString(DateTime.DATETIME_SHORT)}
      {"\n"}
      Value: {point.value.toFixed(decimalPlaces)} {yAxisLabel}
    </div>
  );

  const tooltipFormatter = formatTooltip || defaultFormatTooltip;

  if (points.length === 0) {
    return (
      <div
        className="d-flex align-items-center justify-content-center border rounded"
        style={{ width, height, backgroundColor: "#fafafa" }}
      >
        <span className="text-muted">No data to display</span>
      </div>
    );
  }

  return (
    <div
      className="border rounded p-2 d-flex justify-content-center"
      style={{ backgroundColor: "#fafafa" }}
    >
      <svg
        width={width}
        height={height}
        style={{ maxWidth: "100%", height: "auto" }}
      >
        {/* Background grid lines */}
        {showGrid && (
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#e0e0e0"
                strokeWidth="1"
              />
            </pattern>
          </defs>
        )}
        {showGrid && <rect width={width} height={height} fill="url(#grid)" />}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#666"
          strokeWidth="2"
        />

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#666"
          strokeWidth="2"
        />

        {/* Y-axis labels */}
        {[
          calculatedValueRange.min,
          (calculatedValueRange.min + calculatedValueRange.max) / 2,
          calculatedValueRange.max,
        ].map((value, index) => (
          <g key={index}>
            <text
              x={padding.left - 10}
              y={yScale(value) + 4}
              textAnchor="end"
              fontSize="12"
              fill="#666"
            >
              {value.toFixed(decimalPlaces)}
            </text>
            <line
              x1={padding.left - 5}
              y1={yScale(value)}
              x2={padding.left}
              y2={yScale(value)}
              stroke="#666"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* Y-axis unit label */}
        <text
          x={padding.left - 45}
          y={height / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#666"
          transform={`rotate(-90, ${padding.left - 45}, ${height / 2})`}
        >
          {yAxisLabel}
        </text>

        {/* Data line */}
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {/* Data points with tooltips */}
        {scaledPoints.map((point, index) => {
          const color =
            typeof pointColor === "function"
              ? pointColor(point)
              : pointColor || lineColor;
          return (
            <OverlayTrigger
              key={index}
              placement="top"
              trigger={["hover", "focus"]}
              delay={{ show: 300, hide: 100 }}
              overlay={
                <Tooltip id={`point-tooltip-${index}`}>
                  {tooltipFormatter(point)}
                </Tooltip>
              }
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                stroke="white"
                strokeWidth="2"
                style={{ cursor: "help" }}
              />
            </OverlayTrigger>
          );
        })}

        {/* X-axis time labels */}
        <text
          x={padding.left}
          y={height - 5}
          textAnchor="start"
          fontSize="10"
          fill="#666"
        >
          {DateTime.fromJSDate(calculatedTimeRange.start).toFormat("HH:mm")}
        </text>
        <text
          x={width - padding.right}
          y={height - 5}
          textAnchor="end"
          fontSize="10"
          fill="#666"
        >
          {DateTime.fromJSDate(calculatedTimeRange.end).toFormat("HH:mm")}
        </text>
      </svg>
    </div>
  );
}
