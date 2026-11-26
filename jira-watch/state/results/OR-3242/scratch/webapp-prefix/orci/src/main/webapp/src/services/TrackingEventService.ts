import { Either, Left, Right } from "purify-ts";
import { APIError, APIUnknownError } from "../errors/APIError";
import { CaseID, PatientID, TenantID } from "../types/identifiers";
import { getCookie } from "../utils/cookie";
import { deriveTenantId } from "../utils/tenant";

import { logger } from "../utils/logger";
/**
 * Event types that can be tracked in the application.
 */
export enum EventType {
  SCAN_MEDS_REMINDER_BANNER_SHOWN = "SCAN_MEDS_REMINDER_BANNER_SHOWN",
  COMPLETE_MEDICATION_TABS_BANNER_SHOWN = "COMPLETE_MEDICATION_TABS_BANNER_SHOWN",
  PARTIAL_APP_LAUNCH = "PARTIAL_APP_LAUNCH",
  CITATION_TOOLTIP_HOVER = "CITATION_TOOLTIP_HOVER",
  CITATION_LINK_CLICK = "CITATION_LINK_CLICK",
  WINDOW_FOCUS_CHANGE = "WINDOW_FOCUS_CHANGE",
  WINDOW_NOTIFY = "WINDOW_NOTIFY",
  FAVORITES_MEDICATION_FAVORITED = "FAVORITES_MEDICATION_FAVORITED",
  FAVORITES_MEDICATION_SELECTED = "FAVORITES_MEDICATION_SELECTED",
  FAVORITES_MEDICATION_UNFAVORITED = "FAVORITES_MEDICATION_UNFAVORITED",
  FAVORITES_MACRO_CREATED = "FAVORITES_MACRO_CREATED",
  FAVORITES_MACRO_DELETED = "FAVORITES_MACRO_DELETED",
  FAVORITES_MACRO_FAVORITED = "FAVORITES_MACRO_FAVORITED",
  FAVORITES_MACRO_SELECTED = "FAVORITES_MACRO_SELECTED",
  FAVORITES_MACRO_UNFAVORITED = "FAVORITES_MACRO_UNFAVORITED",
  FAVORITES_SIDEBAR_EXPANDED = "FAVORITES_SIDEBAR_EXPANDED",
  FAVORITES_SIDEBAR_COLLAPSED = "FAVORITES_SIDEBAR_COLLAPSED",
}

/**
 * Interface for event recording requests.
 */
export interface EventRecordRequest {
  patientId: PatientID;
  caseId: CaseID;
  eventType: EventType;
  eventData?: Record<string, any>;
  tenantId: TenantID;
}

/**
 * Service for tracking application events.
 * Provides methods to record user interactions and system events for analytics.
 */
export class TrackingEventService {
  private patientId?: PatientID;
  private caseId?: CaseID;

  /**
   * Initializes the event tracking service with patient and operation context.
   */
  public initialize(patientId: PatientID, caseId: CaseID): void {
    this.patientId = patientId;
    this.caseId = caseId;
  }

  /**
   * Extracts tenant ID from URL parameters or returns default.
   */
  private getTenantId(): TenantID {
    return deriveTenantId() as TenantID;
  }

  /**
   * Records a generic event using sendBeacon with CSRF protection.
   */
  public recordEvent(
    eventType: EventType,
    eventData?: Record<string, any>,
  ): Either<APIError, string> {
    if (!this.patientId || !this.caseId) {
      console.warn(
        "EventTrackingService not initialized. Cannot record event:",
        eventType,
      );
      return Left(
        new APIUnknownError(400, "Service not initialized", {}, null),
      );
    }

    if (!navigator.sendBeacon) {
      console.warn("sendBeacon not supported in this browser");
      return Left(
        new APIUnknownError(501, "sendBeacon not supported", {}, null),
      );
    }

    const tenantId = this.getTenantId();
    const csrfToken = getCookie("XSRF-TOKEN");

    if (!csrfToken) {
      console.warn("CSRF token not found, cannot record event:", eventType);
      return Left(new APIUnknownError(403, "CSRF token required", {}, null));
    }

    const request: EventRecordRequest = {
      patientId: this.patientId,
      caseId: this.caseId,
      eventType,
      eventData: eventData || {},
      tenantId: tenantId,
    };

    const payload = JSON.stringify(request);
    // Pass CSRF token as query parameter since sendBeacon can't send custom headers
    const url = `/api/tracking/record?_csrf=${encodeURIComponent(csrfToken)}`;

    try {
      const blob = new Blob([payload], { type: "application/json" });
      const success = navigator.sendBeacon(url, blob);

      if (success) {
        logger.debug(
          `Event recorded via beacon: ${eventType} for tenant: ${tenantId}`,
        );
        return Right("Event recorded successfully");
      } else {
        console.warn(`Failed to queue event via beacon: ${eventType}`);
        return Left(
          new APIUnknownError(500, "Failed to queue event", {}, null),
        );
      }
    } catch (error) {
      console.warn("sendBeacon error:", eventType, error);
      return Left(new APIUnknownError(500, "sendBeacon failed", {}, error));
    }
  }
}

export default TrackingEventService;
