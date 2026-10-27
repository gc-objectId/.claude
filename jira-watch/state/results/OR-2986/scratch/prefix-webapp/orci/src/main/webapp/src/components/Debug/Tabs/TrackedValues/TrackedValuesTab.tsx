import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  ButtonGroup,
  Form,
  Spinner,
  Table,
} from "react-bootstrap";
import { DateTime } from "luxon";
import { PatientController } from "@api";
import type { TrackedValueDto } from "@api";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import {
  isLoaded,
  isLoading,
  Loadable,
  loading,
} from "../../../../types/Loadable";
import { useDebouncedCallback } from "use-debounce";
import { CopyableIdentifier } from "../../CopyableIdentifier";
import {
  TimeSeriesGraph,
  TimeSeriesDataPoint,
} from "../../Charts/TimeSeriesGraph";
import { snakeCaseToTitleCase } from "../../../../utils/stringUtils";

import { logger } from "../../../../utils/logger";
export type TrackedValuesTabProps = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

export function TrackedValuesTab({ context, isActive }: TrackedValuesTabProps) {
  const [trackedValues, setTrackedValues] = useState<
    Loadable<TrackedValueDto[]>
  >(loading());
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [limit, setLimit] = useState<number>(1000);
  const [viewMode, setViewMode] = useState<"graph" | "table">("graph");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  // Default date range: 7 days ago to today
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  });

  // Load available types once on mount
  const loadAvailableTypes = useCallback(async () => {
    const { data } = await PatientController.getTrackedValues({
      path: { patientId: context.patient.pmrn },
      query: { limit: 1000 },
    });
    if (data) {
      const types = new Set(data.map((tv) => tv.type));
      setAvailableTypes(Array.from(types).sort());
    }
  }, [context.patient.pmrn]);

  const loadTrackedValues = useDebouncedCallback(async () => {
    logger.debug("loading tracked values");
    setIsLoadingData(true);
    setError(null);
    try {
      const { data } = await PatientController.getTrackedValues({
        path: { patientId: context.patient.pmrn },
        query: {
          type:
            selectedType === "ALL"
              ? undefined
              : (selectedType as TrackedValueDto["type"]),
          limit,
          startDate: startDate?.getTime().toString(),
          endDate: endDate?.getTime().toString(),
        },
      });
      logger.debug("getTrackedValues response:", data);
      setTrackedValues(data ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to load tracked values");
      setTrackedValues([]);
    }
    setIsLoadingData(false);
  }, 500);

  useEffect(() => {
    if (isActive) {
      loadAvailableTypes();
      loadTrackedValues();
    }
  }, [
    loadTrackedValues,
    loadAvailableTypes,
    isActive,
    selectedType,
    limit,
    startDate,
    endDate,
  ]);

  // Convert tracked values to graph data points
  const graphDataPoints = useMemo((): Map<
    string,
    TimeSeriesDataPoint<TrackedValueDto>[]
  > => {
    if (isLoading(trackedValues)) return new Map();

    const dataByType = new Map<
      string,
      TimeSeriesDataPoint<TrackedValueDto>[]
    >();

    for (const tv of trackedValues) {
      const type = tv.type;
      if (!dataByType.has(type)) {
        dataByType.set(type, []);
      }
      dataByType.get(type)!.push({
        time: new Date(tv.createdDate),
        value: tv.value ?? 0,
        data: tv,
      });
    }

    // Sort each type's data by time
    for (const points of dataByType.values()) {
      points.sort((a, b) => a.time.getTime() - b.time.getTime());
    }

    return dataByType;
  }, [trackedValues]);

  const formatTooltip = useCallback(
    (point: TimeSeriesDataPoint<TrackedValueDto>) => {
      const tv = point.data!;
      const value = tv.value ?? 0;
      // Use smart decimal formatting based on value magnitude
      const absValue = Math.abs(value);
      let decimals = 2;
      if (absValue < 0.01) decimals = 5;
      else if (absValue < 0.1) decimals = 4;
      else if (absValue < 1) decimals = 3;
      else if (absValue < 100) decimals = 2;
      else decimals = 1;

      return (
        <div style={{ whiteSpace: "pre-line", textAlign: "left" }}>
          {DateTime.fromJSDate(point.time).toLocaleString(
            DateTime.DATETIME_SHORT,
          )}
          {"\n"}
          Type: {tv.type}
          {"\n"}
          Value: {value.toFixed(decimals)}
          {tv.note && `\nNote: ${tv.note}`}
          {tv.operationCaseId && `\nCase: ${tv.operationCaseId}`}
        </div>
      );
    },
    [],
  );

  return (
    <div>
      <div className="mb-3">
        <div className="d-flex gap-2 mb-3 align-items-center flex-wrap">
          <Form.Group className="mb-0">
            <Form.Label className="mb-1">Start Date</Form.Label>
            <Form.Control
              type="datetime-local"
              value={DateTime.fromJSDate(startDate).toFormat(
                "yyyy-MM-dd'T'HH:mm",
              )}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              disabled={isLoadingData}
              style={{ width: "200px" }}
            />
          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label className="mb-1">End Date</Form.Label>
            <Form.Control
              type="datetime-local"
              value={DateTime.fromJSDate(endDate).toFormat(
                "yyyy-MM-dd'T'HH:mm",
              )}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              disabled={isLoadingData}
              style={{ width: "200px" }}
            />
          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label className="mb-1">Type Filter</Form.Label>
            <Form.Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ width: "200px" }}
              disabled={isLoadingData}
            >
              <option value="ALL">All Types</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {snakeCaseToTitleCase(type)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label className="mb-1">Limit</Form.Label>
            <Form.Control
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 1000)}
              style={{ width: "120px" }}
              min={1}
              max={10000}
              disabled={isLoadingData}
            />
          </Form.Group>

          <div className="ms-auto">
            <Form.Label className="mb-1 d-block">View Mode</Form.Label>
            <ButtonGroup>
              <Button
                variant={viewMode === "graph" ? "primary" : "outline-primary"}
                onClick={() => setViewMode("graph")}
                size="sm"
                disabled={isLoadingData}
              >
                Graph
              </Button>
              <Button
                variant={viewMode === "table" ? "primary" : "outline-primary"}
                onClick={() => setViewMode("table")}
                size="sm"
                disabled={isLoadingData}
              >
                Table
              </Button>
            </ButtonGroup>
          </div>
        </div>

        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setError(null)}
            className="mb-3"
          >
            <Alert.Heading>Error Loading Tracked Values</Alert.Heading>
            <p className="mb-2">{error}</p>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => loadTrackedValues()}
              disabled={isLoadingData}
            >
              {isLoadingData ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Retrying...
                </>
              ) : (
                "Retry"
              )}
            </Button>
          </Alert>
        )}

        {isLoadingData || isLoading(trackedValues) ? (
          <div className="text-center p-4">
            <Spinner animation="border" />
            <div className="mt-2">Loading tracked values...</div>
          </div>
        ) : !isLoaded(trackedValues) || trackedValues.length === 0 ? (
          <Alert variant="info">
            No tracked values found for this patient.
          </Alert>
        ) : viewMode === "graph" ? (
          <div>
            {Array.from(graphDataPoints.entries()).map(([type, points]) => (
              <div key={type} className="mb-4">
                <h5>{snakeCaseToTitleCase(type)}</h5>
                <TimeSeriesGraph
                  points={points}
                  width={800}
                  height={200}
                  yAxisLabel={snakeCaseToTitleCase(type)}
                  formatTooltip={formatTooltip}
                  showGrid={true}
                  lineStyle="line"
                />
                <div className="mt-2 text-muted small">
                  {points.length} data points
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Value</th>
                <th>Created Date</th>
                <th>Note</th>
                <th>Operation</th>
              </tr>
            </thead>
            <tbody>
              {trackedValues.map((tv) => (
                <tr key={tv.id}>
                  <td>
                    <CopyableIdentifier value={tv.id} />
                  </td>
                  <td>
                    <span className="badge bg-primary">{tv.type}</span>
                  </td>
                  <td>{(tv.value ?? 0).toFixed(4)}</td>
                  <td>
                    {DateTime.fromISO(tv.createdDate).toLocaleString(
                      DateTime.DATETIME_SHORT,
                    )}
                  </td>
                  <td>
                    <small className="text-muted">
                      {tv.note || <em>No note</em>}
                    </small>
                  </td>
                  <td>
                    <small className="text-muted">
                      {tv.operationCaseId || <em>N/A</em>}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
