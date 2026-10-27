import { Repeat } from "react-bootstrap-icons";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { MedicationAdministrationController } from "@api";
import type { RecentlyAdministeredMed } from "@api";
import { useAppQueryParams } from "../../hooks/hooks";
import { DateTime, Duration } from "luxon";
import "./RecentlyAdministeredMeds.scss";
import { Alert, Col } from "react-bootstrap";
import { debounce, isEmpty } from "lodash";
import { IMessage } from "@stomp/stompjs/src/i-message";
import { EventNotification } from "../../types/EventNotification";
import { useWebsocketSubscription } from "../../context/WebsocketContext";
import * as Sentry from "@sentry/browser";
import { getMedicationLabelStyle } from "../../utils/medicationLabelStyle";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../types/User";

import { logger } from "../../utils/logger";
type MedicationsAction =
  | { type: "LOADING_START" }
  | {
      type: "LOADING_SUCCESS";
      payload: {
        data: RecentlyAdministeredMed[];
        reset: boolean;
        currentPage: number;
        pageSize: number;
      };
    }
  | { type: "LOADING_ERROR" }
  | { type: "RESET_STATE" };

interface MedicationsState {
  medicationAdministrations: RecentlyAdministeredMed[];
  page: number;
  isLoading: boolean;
  hasMore: boolean;
}

function medicationsReducer(
  state: MedicationsState,
  action: MedicationsAction,
): MedicationsState {
  switch (action.type) {
    case "LOADING_START":
      return {
        ...state,
        isLoading: true,
      };
    case "LOADING_SUCCESS": {
      const { data, reset, currentPage, pageSize } = action.payload;

      if (data.length === 0) {
        return {
          ...state,
          medicationAdministrations: reset
            ? []
            : state.medicationAdministrations,
          isLoading: false,
          hasMore: false,
        };
      }

      return {
        medicationAdministrations: reset
          ? data
          : [...state.medicationAdministrations, ...data],
        page: reset ? 1 : currentPage + 1,
        isLoading: false,
        hasMore: data.length === pageSize,
      };
    }
    case "LOADING_ERROR":
      return {
        ...state,
        isLoading: false,
      };
    case "RESET_STATE":
      return {
        ...state,
        page: 0,
        hasMore: true,
      };
    default:
      return state;
  }
}

export function RecentlyAdministeredMeds({
  isSelected,
  onSelectMed,
}: {
  isSelected: boolean;
  onSelectMed: (arg: {
    medicationIdentifier?: string;
    barcodeValue?: string;
  }) => Promise<void>;
}) {
  const { caseId, patientId, tenantId } = useAppQueryParams();

  const [state, dispatch] = useReducer(medicationsReducer, {
    medicationAdministrations: [],
    page: 0,
    isLoading: false,
    hasMore: true,
  });

  const { medicationAdministrations, page, isLoading, hasMore } = state;
  const pageSize = 15;

  // Store the API call parameters and state in a ref to avoid recreating the function
  const stateRef = useRef({
    isLoading,
    hasMore,
    page,
    patientId,
    caseId,
    pageSize,
  });

  // Update the ref when these values change
  useEffect(() => {
    stateRef.current = {
      isLoading,
      hasMore,
      page,
      patientId,
      caseId,
      pageSize,
    };
  }, [isLoading, hasMore, page, patientId, caseId, pageSize]);

  const loadMedications = useCallback(
    async (reset = false) => {
      // Use values from ref to avoid dependencies
      const { isLoading, hasMore, page, patientId, caseId, pageSize } =
        stateRef.current;

      if (isLoading || (!hasMore && !reset)) return;

      dispatch({ type: "LOADING_START" });
      const currentPage = reset ? 0 : page;

      try {
        const { data } =
          await MedicationAdministrationController.getRecentlyAdministeredMedicationAdministrations(
            {
              path: { patientId, caseId },
              query: { page: currentPage, size: pageSize },
            },
          );

        logger.debug("getMedicationAdministrations response:", data);

        if (data) {
          dispatch({
            type: "LOADING_SUCCESS",
            payload: { data, reset, currentPage, pageSize },
          });
        } else {
          dispatch({ type: "LOADING_ERROR" });
        }
      } catch (error) {
        console.error("Error loading medications:", error);
        dispatch({ type: "LOADING_ERROR" });
      }
    },
    [dispatch],
  );

  const onMessage = useCallback(
    (data: IMessage) => {
      const parsedBody = JSON.parse(data.body);
      const result = EventNotification.validate(parsedBody);
      if (result.success) {
        if (
          result.value.eventType ===
            "orci-event/medication-administration-cancelled" ||
          result.value.eventType === "orci-event/medication-administration"
        ) {
          // Reset the list when a new medication is administered or cancelled
          dispatch({ type: "RESET_STATE" });
          // Use setTimeout to ensure state is updated before loading medications
          setTimeout(() => loadMedications(true), 0);
        }
      }
    },
    [dispatch, loadMedications],
  );

  useWebsocketSubscription(
    // fixme: we should not be using the /admin/notifications websocket channel for this.
    //    That channel was meant for the timeline.
    `admin/notifications/${tenantId}/${patientId}`,
    onMessage,
  );

  const [clickedMed, setClickedMed] = useState<string>();
  const [error, setError] = useState<any>();

  /** Initial value is estimated based on measuring one of the rows when not wrapped.
   * Does not account for window size, which can cause wrapping and affect the height.
   * We will determine the actual size in the hook below
   * */
  const [containerHeight, setContainerHeight] = useState<number>((69 + 12) * 3);
  const initialMeasureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const measureAndSetContainerHeight = debounce(() => {
      // try to set the container height so that
      // a). the bottom remains a certain distance from the top of the footer
      // b). it is sized to contain only a whole number of cards initially
      const footerTop = document
        .querySelector(".AppFooter")
        ?.getBoundingClientRect().top;
      const medContainerTop = document
        .querySelector(".med-card-container")
        ?.getBoundingClientRect().top;
      if (!footerTop || !medContainerTop) return;

      const desiredBottomPadding = 75; // px
      let calculatedHeight = footerTop - medContainerTop - desiredBottomPadding;
      const cards = document.querySelectorAll(".med-card-container .med-card");
      const desiredBottom = medContainerTop + calculatedHeight;
      const overflowCardIndex = Array.from(cards).findIndex(
        (card) => card.getBoundingClientRect().bottom > desiredBottom,
      );
      if (overflowCardIndex > 0) {
        const lastCardBeforeCutoff = cards.item(overflowCardIndex - 1);
        calculatedHeight -=
          desiredBottom - lastCardBeforeCutoff?.getBoundingClientRect().bottom;

        // this number is padding, which gives a little space between the bottom of the card and the cutoff
        calculatedHeight += 12;
      }

      setContainerHeight(calculatedHeight);
    }, 20);

    // Clear any existing timeout before setting a new one
    if (initialMeasureTimeoutRef.current !== null) {
      clearTimeout(initialMeasureTimeoutRef.current);
    }

    initialMeasureTimeoutRef.current = setTimeout(() => {
      measureAndSetContainerHeight();
      initialMeasureTimeoutRef.current = null;
    }, 10);

    window.addEventListener("resize", measureAndSetContainerHeight);
    return () => {
      if (initialMeasureTimeoutRef.current !== null) {
        clearTimeout(initialMeasureTimeoutRef.current);
        initialMeasureTimeoutRef.current = null;
      }
      window.removeEventListener("resize", measureAndSetContainerHeight);
    };
  }, [medicationAdministrations]);

  // Reference to the med-card-container for scroll detection
  const medCardContainerRef = useRef<HTMLDivElement>(null);

  // Create a stable scroll handler that doesn't depend on loadMedications
  const handleScrollEvent = useRef(() => {
    const { isLoading, hasMore } = stateRef.current;
    if (!medCardContainerRef.current || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } =
      medCardContainerRef.current;
    // Load more when user scrolls to the bottom (with a small threshold)
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      loadMedications();
    }
  });

  const handleScroll = useCallback(() => {
    handleScrollEvent.current();
  }, []);

  useEffect(() => {
    if (isSelected) {
      loadMedications(true);
      medCardContainerRef.current?.scrollTo(0, 0);
    }
  }, [isSelected, loadMedications]);

  useEffect(() => {
    const container = medCardContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const handleMedCardClick = useCallback(
    async (med: RecentlyAdministeredMed) => {
      setClickedMed(med.id);
      try {
        await onSelectMed({
          medicationIdentifier: med.selectionMedId || undefined,
          barcodeValue: med.selectionBarcode || undefined,
        });
      } catch (e) {
        console.error(
          "Error selecting recently administered medication",
          med,
          e,
        );
        setError(e);
        Sentry.captureException(e);
      }
      setClickedMed(undefined);
    },
    [onSelectMed],
  );

  return (
    <div
      className="recently-administered-meds"
      style={{ display: isEmpty(medicationAdministrations) ? "none" : "block" }}
    >
      <div className="container-md">
        <div className="row">
          <Col md={{ span: 8, offset: 2 }}>
            <div className="title-row">
              <div>Recent Medications:</div>
            </div>
            {error && (
              <Alert
                key={error}
                variant="danger"
                dismissible
                onClose={() => setError(undefined)}
              >
                <p>An error occurred.</p>{" "}
                <small>Check console for details</small>
              </Alert>
            )}
            <div
              className="med-card-container"
              style={{
                height: containerHeight,
                overflowY: "auto", // Enable vertical scrolling
              }}
              ref={medCardContainerRef}
            >
              <div>
                {medicationAdministrations.map((med) => (
                  <MedCard
                    key={med.id}
                    medAdmin={med}
                    disabled={clickedMed !== undefined && clickedMed !== med.id}
                    onClick={() => handleMedCardClick(med)}
                  />
                ))}
              </div>
              {isLoading ? (
                <div className="scroll-loading-indicator" />
              ) : (
                <div style={{ height: "12px" }}></div>
              )}
            </div>
          </Col>
        </div>
      </div>
    </div>
  );
}

function MedCard({
  medAdmin,
  onClick,
  disabled,
}: {
  medAdmin: RecentlyAdministeredMed;
  onClick: () => Promise<void>;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const userIsAdmin = isAdmin(user);

  const style =
    medAdmin.colorLabelSetting != null
      ? getMedicationLabelStyle(medAdmin.colorLabelSetting, false)
      : {};

  const titleText = userIsAdmin
    ? [medAdmin.selectionMedId, medAdmin.selectionBarcode].join(" ")
    : undefined;

  return (
    <div
      className={
        "med-card pointer" +
        (loading ? " loading" : "") +
        (disabled ? " disabled" : "")
      }
      onClick={async () => {
        setLoading(true);
        try {
          await onClick();
        } catch (e) {}
        setLoading(false);
      }}
    >
      {loading && <SelectionLoadingIndicator />}
      <div className="contents">
        <div className="color-label" style={style} />
        <div className="left">
          <div className="medName">{medAdmin.shortName}</div>
          <div className="text-secondary small" title={titleText}>
            Last dose: <span className="dose">{medAdmin.dose}</span>{" "}
            <span className="route">{medAdmin.route}</span>
          </div>
        </div>
        <div className="right">
          <div className="timeAgo">
            {humanizeDuration(
              DateTime.fromISO(medAdmin.administrationDate ?? "")
                .diffNow()
                .negate(),
            )}
          </div>
          <button className="btn reselect">
            <span className="icon">
              <Repeat />
            </span>
            Readminister
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectionLoadingIndicator() {
  const spinnerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const x = setInterval(() => {
      if (!spinnerRef.current) return;
      let curr = parseInt(
        spinnerRef.current.style
          .getPropertyValue("--spinner-angle")
          .replace("deg", ""),
      );
      if (isNaN(curr)) curr = 180;
      spinnerRef.current.style.setProperty(
        "--spinner-angle",
        String((curr + 2) % 360) + "deg",
      );
    }, 20);
    return () => clearInterval(x);
  }, []);
  return <div className="selection-loading-indicator" ref={spinnerRef} />;
}

function humanizeDuration(duration: Duration): string {
  const rescaled = duration.rescale();
  const days = rescaled.get("days");
  if (days > 0) {
    if (days > 1) return `${days}d ago`;
    else return `1d ago`;
  }

  const hours = rescaled.get("hours");
  if (hours > 0) {
    if (hours > 1) return `${hours}hrs ago`;
    else return `1hr ago`;
  }

  const minutes = rescaled.get("minutes");
  if (minutes > 0) {
    if (minutes > 1) return `${minutes}m ago`;
  }
  return "just now";
}
