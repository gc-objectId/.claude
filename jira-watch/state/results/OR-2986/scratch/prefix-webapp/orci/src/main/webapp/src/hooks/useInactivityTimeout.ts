import { useIdle } from "@uidotdev/usehooks";
import { useEffect } from "react";
import { closeWindow, disableCloseDialog } from "../utils/windowControl";
import { useAuth } from "../context/AuthContext";
import { useAppQueryParams } from "./hooks";
import { useTrackingEvent } from "./useTrackingEvent";

const INACTIVITY_TIME_MS = 1000 * 60 * 60 * 12;

/**
 * Intended to enforce logout policy, this hook signals to autohotkey
 * that the window should close after a fixed period of user inactivity has passed.
 */
export function useInactivityTimeout() {
  const idle = useIdle(INACTIVITY_TIME_MS);
  const { logout } = useAuth();
  const queryParams = useAppQueryParams();
  const { trackingService } = useTrackingEvent(
    queryParams.patientId,
    queryParams.caseId,
  );
  useEffect(() => {
    if (idle) {
      (async () => {
        try {
          await logout();
        } catch (e) {}
        disableCloseDialog();
        closeWindow(trackingService);
      })();
    }
  }, [idle, logout, trackingService]);
}
