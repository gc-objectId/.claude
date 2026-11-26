import { useCallback, useMemo } from "react";
import {
  TrackingEventService,
  EventType,
} from "../services/TrackingEventService";
import { PatientID, CaseID } from "../types/identifiers";

/**
 * Hook for tracking events with automatic service initialization.
 * Provides a simple interface to record events without manual initialization.
 */
export function useTrackingEvent(patientId?: PatientID, caseId?: CaseID) {
  const trackingService = useMemo(() => {
    const service = new TrackingEventService();
    if (patientId && caseId) {
      service.initialize(patientId, caseId);
    }
    return service;
  }, [patientId, caseId]);

  const recordEvent = useCallback(
    (eventType: EventType, eventData: Record<string, any> = {}) => {
      if (patientId && caseId) {
        trackingService.recordEvent(eventType, eventData);
      }
    },
    [trackingService, patientId, caseId],
  );

  return {
    trackingService,
    recordEvent,
    isReady: Boolean(patientId && caseId),
  };
}
