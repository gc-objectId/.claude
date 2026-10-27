import { useEffect } from "react";
import { Alert } from "react-bootstrap";
import { EventType } from "../services/TrackingEventService";
import { useAppQueryParams } from "../hooks/hooks";
import { useTrackingEvent } from "../hooks/useTrackingEvent";

interface ScanMedsReminderBannerProps {
  show: boolean;
  setShow(b: boolean): void;
}

export const ScanMedsReminderBanner = ({
  show,
  setShow,
}: ScanMedsReminderBannerProps) => {
  const { patientId, caseId } = useAppQueryParams();
  const { recordEvent } = useTrackingEvent(patientId, caseId);

  // Track event when banner is shown
  useEffect(() => {
    if (show) {
      recordEvent(EventType.SCAN_MEDS_REMINDER_BANNER_SHOWN, {});
    }
  }, [show, recordEvent]);

  return (
    <div>
      {
        <Alert
          dismissible
          onClose={() => setShow(false)}
          show={show}
          variant="warning"
        >
          Remember to scan medications
        </Alert>
      }
    </div>
  );
};
