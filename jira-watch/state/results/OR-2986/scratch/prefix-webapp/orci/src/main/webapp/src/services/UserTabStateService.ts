import {
  CaseID,
  PatientID,
  TenantID,
  TrackingTabID,
  UserID,
} from "../types/identifiers";
import axios from "axios";
import { RestoreTabResolution } from "../types/RestoreTabResolution";
import { $request } from "../utils/request";
import { RestorePromptType } from "../types/RestorePromptType";
import { DateTime } from "luxon";

export class UserTabStateService {
  trackCancel(
    userId: UserID,
    clientId: TenantID,
    resolution: RestoreTabResolution,
    trackingTabId: TrackingTabID,
  ) {
    if (trackingTabId) {
      const payload = {
        userId,
        clientId,
        trackingTabId,
        resolution,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      return $request({
        url: `/api/tab/${trackingTabId}/cancel`,
        method: "POST",
        headers: {
          "X-Tenant-Id": clientId,
          "Content-Type": "application/json",
        },
        data: payload,
      });
    }
  }
  resolveTabs(
    clientId: TenantID,
    patientId: PatientID,
    caseId: CaseID,
    promptTime: DateTime | undefined,
    type: RestorePromptType,
    resolution: RestoreTabResolution,
  ) {
    const payload = {
      patientId,
      caseId,
      promptTime: promptTime?.toISO(),
      resolution,
      type,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    return $request({
      url: `/api/tab/resolve`,
      method: "POST",
      headers: { "X-Tenant-Id": clientId, "Content-Type": "application/json" },
      data: payload,
    });
  }

  checkForOutstandingMedicationTabsFromOtherUsers(
    clientId: TenantID,
    patientId: PatientID,
    caseId: CaseID,
  ) {
    const payload = {
      patientId,
      caseId,
    };
    return $request({
      url: `/api/tab/eoc/check`,
      method: "POST",
      headers: { "X-Tenant-Id": clientId, "Content-Type": "application/json" },
      data: payload,
    });
  }
}

export default UserTabStateService;
