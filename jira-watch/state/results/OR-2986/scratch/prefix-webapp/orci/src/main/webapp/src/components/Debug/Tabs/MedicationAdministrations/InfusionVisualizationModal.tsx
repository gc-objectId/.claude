import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  Modal,
  OverlayTrigger,
  Row,
  Spinner,
  Tooltip,
} from "react-bootstrap";
import { DateTime } from "luxon";
import { DatePickerField } from "../../../Form/DatePickerField";
import { Form as FormikForm, Formik } from "formik";
import {
  TimeSeriesDataPoint,
  TimeSeriesGraph,
} from "../../Charts/TimeSeriesGraph";
import {
  InfusionEventDto,
  InfusionMedAdminDebugController,
  MedicationAdministrationDto,
} from "@api";
import { isEmpty } from "lodash";

interface InfusionVisualizationModalProps {
  show: boolean;
  onHide: () => void;
  infusion: MedicationAdministrationDto | null;
}

interface TimelineSegment {
  startTime: Date;
  endTime: Date | null;
  event: InfusionEventWithDate;
  isOngoing: boolean;
}

interface VolumeCalculationResult {
  volume: string | null;
  unit: string | null;
  error: string | null;
  loading: boolean;
}

interface DoseCalculationResult {
  dose: string | null;
  unit: string | null;
  error: string | null;
  loading: boolean;
}

interface RatePoint {
  time: Date;
  rate: number;
  unit: string;
  eventType: string;
}

type InfusionEventWithDate = Omit<InfusionEventDto, "eventDate"> & {
  eventDate: Date;
};

export function InfusionVisualizationModal({
  show,
  onHide,
  infusion,
}: InfusionVisualizationModalProps) {
  const [selectedRange, setSelectedRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [calculation, setCalculation] = useState<VolumeCalculationResult>({
    volume: null,
    unit: null,
    error: null,
    loading: false,
  });
  const [doseCalculation, setDoseCalculation] = useState<DoseCalculationResult>(
    {
      dose: null,
      unit: null,
      error: null,
      loading: false,
    },
  );
  const [medicationCategories, setMedicationCategories] = useState<string[]>(
    [],
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isMultiComponent, setIsMultiComponent] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const events = useMemo(
    () =>
      (infusion?.infusionEvents || [])
        .filter((event) => !!event.eventDate)
        .map(
          (event) =>
            ({
              ...event,
              eventDate: new Date(event.eventDate!),
            } satisfies InfusionEventWithDate),
        ),
    [infusion],
  );

  const segments = useMemo((): TimelineSegment[] => {
    if (isEmpty(events)) return [];

    const sortedEvents = events.sort(
      (a, b) => a.eventDate.getTime() - b.eventDate.getTime(),
    );

    const segments: TimelineSegment[] = [];
    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      const nextEvent = sortedEvents[i + 1];

      segments.push({
        startTime: event.eventDate,
        endTime: nextEvent ? nextEvent.eventDate : null,
        event,
        isOngoing: !nextEvent && event.eventType !== "STOP",
      });
    }

    return segments;
  }, [events]);

  const ratePoints = useMemo((): RatePoint[] => {
    if (isEmpty(events)) return [];

    const sortedEvents = events.sort(
      (a, b) => a.eventDate.getTime() - b.eventDate.getTime(),
    );

    const points: RatePoint[] = [];
    for (const event of sortedEvents) {
      const rate =
        event.eventType === "STOP"
          ? 0
          : parseFloat(String(event.rateAmount || "0")) || 0;
      const unit = event.rateUnits || "";

      points.push({
        time: new Date(event.eventDate!),
        rate,
        unit,
        eventType: event.eventType!,
      });
    }

    return points;
  }, [events]);

  const timelineRange = useMemo(() => {
    if (segments.length === 0) return null;

    const start = segments[0].startTime;
    const lastSegment = segments[segments.length - 1];

    const end =
      lastSegment.endTime ||
      new Date(lastSegment.startTime.getTime() + 60 * 60 * 1000); // Default to 1 hour from last event

    return { start, end };
  }, [segments]);

  const debounceTimeout = useRef<NodeJS.Timeout>();
  const doseDebouncetimeout = useRef<NodeJS.Timeout>();

  // Load medication categories when infusion changes
  useEffect(() => {
    if (infusion?.id) {
      InfusionMedAdminDebugController.getMedicationCategories({
        path: { medicationAdministrationId: infusion.id },
      }).then(({ data }) => {
        if (!data || data.error) {
          console.error("Error loading categories:", data?.error);
          setMedicationCategories([]);
          setIsMultiComponent(false);
          setSelectedCategory("");
        } else {
          setMedicationCategories(data.categories || []);
          setIsMultiComponent(data.isMultiComponent || false);

          if (data.isMultiComponent) {
            // For multi-component, let user choose from dropdown
            if (data.categories && data.categories.length > 0) {
              setSelectedCategory(data.categories[0]);
            }
          } else {
            // For single-component, use primary category automatically
            setSelectedCategory(data.primaryCategory || "");
          }
        }
      });
    }
  }, [infusion?.id, show]);

  const calculateVolume = useCallback(
    async (startTime: Date, endTime: Date) => {
      if (!infusion?.id) return;

      setCalculation((prev) => ({ ...prev, loading: true }));

      try {
        const { data } =
          await InfusionMedAdminDebugController.calculateInfusionVolume({
            body: {
              medicationAdministrationId: infusion.id,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
            },
          });

        if (data) {
          // Round volume to 3 significant figures
          const roundedVolume = data.volume
            ? parseFloat(parseFloat(data.volume).toPrecision(3)).toString()
            : null;
          setCalculation({
            volume: roundedVolume,
            unit: data.unit ?? null,
            error: data.error ?? null,
            loading: false,
          });
        } else {
          setCalculation({
            volume: null,
            unit: null,
            error: "Failed to calculate volume",
            loading: false,
          });
        }
      } catch (error) {
        setCalculation({
          volume: null,
          unit: null,
          error: "Network error occurred",
          loading: false,
        });
      }
    },
    [infusion?.id],
  );

  const debouncedCalculateVolume = useCallback(
    (startTime: Date, endTime: Date) => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(() => {
        calculateVolume(startTime, endTime);
      }, 500);
    },
    [calculateVolume],
  );

  const calculateDose = useCallback(
    async (startTime: Date, endTime: Date, category: string) => {
      if (!infusion?.id || !category) return;

      setDoseCalculation((prev) => ({ ...prev, loading: true }));

      try {
        const { data } =
          await InfusionMedAdminDebugController.calculateInfusionDose({
            body: {
              medicationAdministrationId: infusion.id,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              medicationCategory: category,
            },
          });

        if (data) {
          // Round dose to 3 significant figures
          const roundedDose = data.dose
            ? parseFloat(parseFloat(data.dose).toPrecision(3)).toString()
            : null;
          setDoseCalculation({
            dose: roundedDose,
            unit: data.unit ?? null,
            error: data.error ?? null,
            loading: false,
          });
        } else {
          setDoseCalculation({
            dose: null,
            unit: null,
            error: "Failed to calculate dose",
            loading: false,
          });
        }
      } catch (error) {
        setDoseCalculation({
          dose: null,
          unit: null,
          error: "Network error occurred",
          loading: false,
        });
      }
    },
    [infusion?.id],
  );

  const debouncedCalculateDose = useCallback(
    (startTime: Date, endTime: Date, category: string) => {
      if (doseDebouncetimeout.current) {
        clearTimeout(doseDebouncetimeout.current);
      }

      doseDebouncetimeout.current = setTimeout(() => {
        calculateDose(startTime, endTime, category);
      }, 500);
    },
    [calculateDose],
  );

  // Cleanup debounce timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (doseDebouncetimeout.current) {
        clearTimeout(doseDebouncetimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedRange) {
      debouncedCalculateVolume(selectedRange.start, selectedRange.end);
      if (selectedCategory) {
        debouncedCalculateDose(
          selectedRange.start,
          selectedRange.end,
          selectedCategory,
        );
      }
    }
  }, [
    selectedRange,
    selectedCategory,
    debouncedCalculateVolume,
    debouncedCalculateDose,
  ]);

  const handleManualTimeChange = useCallback((start: Date, end: Date) => {
    if (start && end && start < end) {
      setSelectedRange({ start, end });
    }
  }, []);

  const getPositionFromTime = useCallback(
    (time: Date) => {
      if (!timelineRange) return 0;
      const totalDuration =
        timelineRange.end.getTime() - timelineRange.start.getTime();
      const timeOffset = time.getTime() - timelineRange.start.getTime();
      return (timeOffset / totalDuration) * 100;
    },
    [timelineRange],
  );

  const getTimeFromPosition = useCallback(
    (percentage: number) => {
      if (!timelineRange) return new Date();
      const totalDuration =
        timelineRange.end.getTime() - timelineRange.start.getTime();
      return new Date(
        timelineRange.start.getTime() + (percentage / 100) * totalDuration,
      );
    },
    [timelineRange],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current || !timelineRange) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      const time = getTimeFromPosition(Math.max(0, Math.min(100, percentage)));

      setIsDragging(true);
      setSelectedRange({ start: time, end: time });
    },
    [timelineRange, getTimeFromPosition],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (
        !isDragging ||
        !timelineRef.current ||
        !selectedRange ||
        !timelineRange
      )
        return;

      const rect = timelineRef.current.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      const time = getTimeFromPosition(Math.max(0, Math.min(100, percentage)));

      setSelectedRange((prev) =>
        prev
          ? {
              start: time < prev.start ? time : prev.start,
              end: time > prev.start ? time : prev.start,
            }
          : null,
      );
    },
    [isDragging, selectedRange, timelineRange, getTimeFromPosition],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const formatDuration = useCallback((startTime: Date, endTime: Date) => {
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    const parts = [];

    if (diffDays > 0) {
      parts.push(`${diffDays} day${diffDays !== 1 ? "s" : ""}`);
    }

    const remainingHours = diffHours % 24;
    if (remainingHours > 0) {
      parts.push(`${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`);
    }

    const remainingMinutes = diffMinutes % 60;
    if (remainingMinutes > 0 || parts.length === 0) {
      parts.push(
        `${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`,
      );
    }

    return parts.join(", ");
  }, []);

  const formatSegmentTooltip = useCallback(
    (segment: TimelineSegment) => {
      const lines = [];

      // Event type and time
      lines.push(
        `${segment.event.eventType} at ${DateTime.fromJSDate(
          segment.startTime,
        ).toLocaleString(DateTime.DATETIME_SHORT)}`,
      );

      lines.push(`(${segment.event.rawAction})`);

      // Rate information
      if (segment.event.rateAmount && segment.event.rateUnits) {
        lines.push(
          `Rate: ${segment.event.rateAmount} ${segment.event.rateUnits}`,
        );
      } else if (segment.event.eventType === "STOP") {
        lines.push("Rate: 0 (stopped)");
      } else {
        lines.push("Rate: Not specified");
      }

      // Dose information
      if (segment.event.doseAmount && segment.event.doseUnits) {
        lines.push(
          `Dose: ${segment.event.doseAmount} ${segment.event.doseUnits}`,
        );
      } else if (segment.event.eventType === "STOP") {
        lines.push("Dose: 0 (stopped)");
      } else {
        lines.push("Dose: Not specified");
      }

      // Duration if not ongoing
      if (segment.endTime) {
        const duration = formatDuration(segment.startTime, segment.endTime);
        lines.push(`Duration: ${duration}`);
      } else if (segment.isOngoing) {
        lines.push("Duration: Ongoing");
      }

      return lines.join("\n");
    },
    [formatDuration],
  );

  // Convert rate points to TimeSeriesDataPoint format
  const rateGraphPoints = useMemo((): TimeSeriesDataPoint<RatePoint>[] => {
    return ratePoints.map((point) => ({
      time: point.time,
      value: point.rate,
      data: point,
    }));
  }, [ratePoints]);

  const formatRateTooltip = useCallback(
    (point: TimeSeriesDataPoint<RatePoint>) => {
      const ratePoint = point.data!;
      return (
        <div style={{ whiteSpace: "pre-line", textAlign: "left" }}>
          {`${ratePoint.eventType} at ${DateTime.fromJSDate(
            ratePoint.time,
          ).toLocaleString(DateTime.DATETIME_SHORT)}`}
          {"\n"}
          {ratePoint.rate > 0
            ? `Rate: ${ratePoint.rate} ${ratePoint.unit}`
            : "Rate: 0 (stopped)"}
        </div>
      );
    },
    [],
  );

  const rateUnit = useMemo(
    () => ratePoints.find((p) => p.unit)?.unit || "",
    [ratePoints],
  );

  if (!infusion) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Infusion Visualization - {infusion.medicationName}
          {medicationCategories.length > 0 && (
            <small className="text-muted ms-2">
              ({isMultiComponent ? "Multi-component" : "Single-component"})
            </small>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Manual Time Range Input */}
        <div className="mb-4">
          <h6>Time Range Selection</h6>
          <Formik
            initialValues={{
              startTime:
                selectedRange?.start || timelineRange?.start || new Date(),
              endTime: selectedRange?.end || timelineRange?.end || new Date(),
            }}
            enableReinitialize
            onSubmit={(values) => {
              handleManualTimeChange(values.startTime, values.endTime);
            }}
          >
            {({ values, setFieldValue }) => (
              <FormikForm>
                <Row>
                  <Col md={5}>
                    <Form.Group>
                      <Form.Label>Start Time</Form.Label>
                      <DatePickerField
                        name="startTime"
                        dateFormat="Pp"
                        showTimeSelect
                        className="form-control"
                        onChange={(date: Date) => {
                          setFieldValue("startTime", date);
                          if (date && values.endTime && date < values.endTime) {
                            handleManualTimeChange(date, values.endTime);
                          }
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={5}>
                    <Form.Group>
                      <Form.Label>End Time</Form.Label>
                      <DatePickerField
                        name="endTime"
                        dateFormat="Pp"
                        showTimeSelect
                        className="form-control"
                        onChange={(date: Date) => {
                          setFieldValue("endTime", date);
                          if (
                            values.startTime &&
                            date &&
                            values.startTime < date
                          ) {
                            handleManualTimeChange(values.startTime, date);
                          }
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={2} className="d-flex align-items-end">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      type="submit"
                      className="mb-0"
                    >
                      Apply
                    </Button>
                  </Col>
                </Row>
              </FormikForm>
            )}
          </Formik>
        </div>

        <div className="mb-3">
          <h6>Timeline Visualization</h6>
          <div className="small text-muted mb-2">
            Drag on the timeline below to visually select a time range
          </div>
          <div
            ref={timelineRef}
            className="position-relative border rounded p-2"
            style={{
              height: "120px",
              cursor: "crosshair",
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Timeline axis */}
            <div
              className="position-absolute border-bottom w-100"
              style={{ top: "50%", transform: "translateY(-50%)" }}
            />

            {/* Segments */}
            {segments.map((segment, index) => {
              const startPos = getPositionFromTime(segment.startTime);
              const endPos = segment.endTime
                ? getPositionFromTime(segment.endTime)
                : 100;

              const width = endPos - startPos;

              return (
                <div key={index}>
                  {/* Segment bar with tooltip */}
                  <OverlayTrigger
                    placement="top"
                    trigger={["hover", "focus"]}
                    delay={{ show: 300, hide: 100 }}
                    overlay={
                      <Tooltip id={`segment-tooltip-${index}`}>
                        <div
                          style={{ whiteSpace: "pre-line", textAlign: "left" }}
                        >
                          {formatSegmentTooltip(segment)}
                        </div>
                      </Tooltip>
                    }
                  >
                    <div
                      className={`position-absolute ${
                        segment.event.eventType === "STOP"
                          ? "bg-danger"
                          : segment.isOngoing
                          ? "bg-success"
                          : "bg-primary"
                      }`}
                      style={{
                        left: `${startPos}%`,
                        width: `${width}%`,
                        top: "45%",
                        height: "10%",
                        minWidth: "2px",
                        cursor: "help",
                        pointerEvents: isDragging ? "none" : "auto",
                      }}
                    />
                  </OverlayTrigger>

                  {/* Event marker with tooltip */}
                  <OverlayTrigger
                    placement="top"
                    trigger={["hover", "focus"]}
                    delay={{ show: 300, hide: 100 }}
                    overlay={
                      <Tooltip id={`marker-tooltip-${index}`}>
                        <div
                          style={{ whiteSpace: "pre-line", textAlign: "left" }}
                        >
                          {formatSegmentTooltip(segment)}
                        </div>
                      </Tooltip>
                    }
                  >
                    <div
                      className="position-absolute bg-dark rounded-circle"
                      style={{
                        left: `${startPos}%`,
                        top: "40%",
                        width: "8px",
                        height: "8px",
                        transform: "translateX(-50%)",
                        cursor: "help",
                        pointerEvents: isDragging ? "none" : "auto",
                      }}
                    />
                  </OverlayTrigger>

                  {/* Event label */}
                  <div
                    className="position-absolute small text-center"
                    style={{
                      left: `${Math.max(startPos, 5)}%`, // Ensure minimum 5% from left edge
                      top: "70%",
                      transform:
                        startPos < 5 ? "translateX(0)" : "translateX(-50%)", // Don't center if near left edge
                      fontSize: "0.7rem",
                      minWidth: "fit-content",
                    }}
                  >
                    {segment.event.eventType}
                  </div>
                </div>
              );
            })}

            {/* Selected range overlay */}
            {selectedRange && timelineRange && (
              <div
                className="position-absolute bg-info"
                style={{
                  left: `${getPositionFromTime(selectedRange.start)}%`,
                  width: `${
                    getPositionFromTime(selectedRange.end) -
                    getPositionFromTime(selectedRange.start)
                  }%`,
                  top: "30%",
                  height: "40%",
                  opacity: 0.3,
                }}
              />
            )}
          </div>

          {/* Time labels */}
          {timelineRange && (
            <div className="d-flex justify-content-between mt-1 small text-muted px-2">
              <span style={{ textAlign: "left" }}>
                {DateTime.fromJSDate(timelineRange.start).toLocaleString(
                  DateTime.DATETIME_SHORT,
                )}
              </span>
              <span style={{ textAlign: "right" }}>
                {DateTime.fromJSDate(timelineRange.end).toLocaleString(
                  DateTime.DATETIME_SHORT,
                )}
              </span>
            </div>
          )}
        </div>

        {/* Rate Graph */}
        {rateGraphPoints.length > 0 && timelineRange && (
          <div className="mb-3">
            <h6>Rate Visualization</h6>
            <div className="small text-muted mb-2">Infusion rate over time</div>
            <TimeSeriesGraph
              points={rateGraphPoints}
              width={500}
              height={150}
              yAxisLabel={`Rate (${rateUnit})`}
              formatTooltip={formatRateTooltip}
              showGrid={true}
              lineStyle="step"
              timeRange={timelineRange}
              pointColor={(point) =>
                point.data?.eventType === "STOP" ? "#dc3545" : "#0d6efd"
              }
            />
          </div>
        )}

        {/* Selected range info */}
        {selectedRange && (
          <div className="mb-3">
            <h6>Selected Time Range</h6>
            <div className="row">
              <div className="col-md-4">
                <strong>Start:</strong>
                <br />
                <span className="text-muted">
                  {DateTime.fromJSDate(selectedRange.start).toLocaleString(
                    DateTime.DATETIME_SHORT,
                  )}
                </span>
              </div>
              <div className="col-md-4">
                <strong>End:</strong>
                <br />
                <span className="text-muted">
                  {DateTime.fromJSDate(selectedRange.end).toLocaleString(
                    DateTime.DATETIME_SHORT,
                  )}
                </span>
              </div>
              <div className="col-md-4">
                <strong>Duration:</strong>
                <br />
                <span className="text-muted">
                  {formatDuration(selectedRange.start, selectedRange.end)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Calculation results */}
        <div className="mb-3">
          <h6>Calculation Results</h6>

          {/* Volume Calculation */}
          <div className="mb-3">
            <h6 className="h6 text-muted">Volume</h6>
            {calculation.loading && (
              <div className="d-flex align-items-center">
                <Spinner size="sm" className="me-2" />
                Calculating volume...
              </div>
            )}
            {calculation.error && (
              <Alert variant="danger" className="mb-2">
                {calculation.error}
              </Alert>
            )}
            {calculation.volume && calculation.unit && !calculation.loading && (
              <div className="alert alert-success mb-2">
                <strong>
                  {calculation.volume} {calculation.unit}
                </strong>
              </div>
            )}
          </div>

          {/* Dose Calculation */}
          {medicationCategories.length > 0 && (
            <div className="mb-3">
              <h6 className="h6 text-muted">
                {isMultiComponent ? "Dosage by Category" : "Dosage"}
              </h6>

              {isMultiComponent ? (
                <Row className="mb-2">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Medication Category</Form.Label>
                      <Form.Select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          // Clear previous dose calculation when category changes
                          setDoseCalculation({
                            dose: null,
                            unit: null,
                            error: null,
                            loading: false,
                          });
                        }}
                      >
                        <option value="">Select a category...</option>
                        {medicationCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              ) : (
                selectedCategory && (
                  <div className="mb-2">
                    <small className="text-muted">
                      Calculating dose for: <strong>{selectedCategory}</strong>
                    </small>
                  </div>
                )
              )}

              {selectedCategory && (
                <>
                  {doseCalculation.loading && (
                    <div className="d-flex align-items-center">
                      <Spinner size="sm" className="me-2" />
                      Calculating dose...
                    </div>
                  )}
                  {doseCalculation.error && (
                    <Alert variant="danger" className="mb-2">
                      {doseCalculation.error}
                    </Alert>
                  )}
                  {doseCalculation.dose &&
                    doseCalculation.unit &&
                    !doseCalculation.loading && (
                      <div className="alert alert-info mb-2">
                        <strong>
                          {doseCalculation.dose} {doseCalculation.unit}
                        </strong>
                        <small className="d-block text-muted">
                          {selectedCategory} dose for selected time range
                        </small>
                      </div>
                    )}
                </>
              )}
            </div>
          )}

          {!selectedRange &&
            !calculation.loading &&
            !doseCalculation.loading && (
              <div className="text-muted">
                Drag on the timeline to select a time range for calculation
              </div>
            )}
        </div>

        {/* Event details */}
        <div>
          <h6>Infusion Events</h6>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Mapped Type</th>
                  <th>Raw Type</th>
                  <th>Rate</th>
                  <th>Dose</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment, index) => (
                  <tr key={index}>
                    <td>
                      {DateTime.fromJSDate(segment.startTime).toLocaleString(
                        DateTime.DATETIME_SHORT,
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          segment.event.eventType === "START"
                            ? "bg-success"
                            : segment.event.eventType === "STOP"
                            ? "bg-danger"
                            : "bg-warning"
                        }`}
                      >
                        {segment.event.eventType}
                      </span>
                    </td>
                    <td>
                      <span>{segment.event.rawAction}</span>
                    </td>
                    <td>
                      {segment.event.rateAmount && segment.event.rateUnits
                        ? `${segment.event.rateAmount} ${segment.event.rateUnits}`
                        : "-"}
                    </td>
                    <td>
                      {segment.event.doseAmount && segment.event.doseUnits
                        ? `${segment.event.doseAmount} ${segment.event.doseUnits}`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
