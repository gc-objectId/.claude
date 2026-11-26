import React, {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAppQueryParams } from "../../hooks/hooks";
import { isLoaded, isLoading, Loadable, loading } from "../../types/Loadable";
import { Col, Form, Spinner } from "react-bootstrap";
import { objectEntries } from "../../utils/recordUtils";
import { snakeCaseToTitleCase } from "../../utils/stringUtils";
import { RuleSettingsController } from "@api";

import { logger } from "../../utils/logger";
const UPDATE_TOLERATED_MEDICATIONS_DEBOUNCE_INTERVAL_MS = 1000;

export function ToleratedMedicationsTab({
  showTabRef,
}: {
  showTabRef: MutableRefObject<boolean>;
}) {
  const { patientId, caseId, tenantId } = useAppQueryParams();

  const [toleratedMedicationCategories, setToleratedMedicationCategories] =
    useState<Loadable<Record<string, boolean>>>(loading());

  useEffect(() => {
    RuleSettingsController.getToleratedMedicationCategories({
      path: {
        caseId,
        patientId,
      },
    }).then(
      (result) => result.data && setToleratedMedicationCategories(result.data),
    );
  }, [caseId, patientId, tenantId]);

  // Some subtlety: this is to debounce the call to setToleratedMedicationCategories,
  // but we want to make sure we still update even if the user closes the settings modal before the time expires.
  // useDebouncedCallback doesn't have this property, so we are rolling our own here
  const timerRef = useRef<number | null>(null);
  // useRef to avoid useTimeout capturing stale values
  const toleratedMedicationCategoriesRef = useRef<
    Loadable<Record<string, boolean>>
  >(toleratedMedicationCategories);
  useEffect(() => {
    toleratedMedicationCategoriesRef.current = toleratedMedicationCategories;
  }, [toleratedMedicationCategories]);

  const scheduleUpdate = useCallback(() => {
    // Clear any existing timeout using ref
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    const timerHandle = setTimeout((_) => {
      if (isLoaded(toleratedMedicationCategoriesRef.current)) {
        RuleSettingsController.setToleratedMedicationCategories({
          path: {
            caseId,
            patientId,
          },
          body: toleratedMedicationCategoriesRef.current,
        });
      }
      timerRef.current = null;
    }, UPDATE_TOLERATED_MEDICATIONS_DEBOUNCE_INTERVAL_MS);
    timerRef.current = timerHandle;
  }, [caseId, patientId, tenantId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    showTabRef.current =
      isLoaded(toleratedMedicationCategories) &&
      objectEntries(toleratedMedicationCategories).length > 0;
    logger.debug("FOO!", showTabRef);
  }, [showTabRef, toleratedMedicationCategories]);

  return (
    <div className="mt-2">
      {isLoading(toleratedMedicationCategories) ? (
        <Spinner />
      ) : objectEntries(toleratedMedicationCategories).length === 0 ? (
        "Patient has no explicitly tolerated medications"
      ) : (
        <div>
          <Col
            style={{
              paddingLeft: "11px",
              paddingRight: "11px",
              paddingTop: "8px",
              margin: "0",
              borderBottom: "1px solid lightgrey",
            }}
            className="mb-3 pb-3 guided-maroon"
          >
            Disabling an alert hides that type of alert for the medication for
            this case.
          </Col>
          {objectEntries(toleratedMedicationCategories).map(
            ([categoryName, status]) => (
              <TolerationToggle
                key={categoryName}
                categoryName={categoryName}
                status={status}
                onStatusChanged={(status) => {
                  setToleratedMedicationCategories({
                    ...toleratedMedicationCategories,
                    [categoryName]: status,
                  });
                  scheduleUpdate();
                }}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function TolerationToggle({
  categoryName,
  onStatusChanged,
  status,
  disabled = false,
}: {
  categoryName: string;
  onStatusChanged: (status: boolean) => void;
  status: boolean;
  disabled?: boolean;
}) {
  return (
    <Col
      style={{
        paddingLeft: "11px",
        paddingRight: "11px",
        paddingTop: "8px",
        margin: "0",
      }}
    >
      <Form.Switch
        id={`toggle-medication-category-${categoryName}`}
        label={
          <div>
            Cross-reaction alerts for {snakeCaseToTitleCase(categoryName)}
          </div>
        }
        onChange={(e) => onStatusChanged(e.currentTarget.checked)}
        disabled={disabled}
        checked={status}
      />
    </Col>
  );
}
