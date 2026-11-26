import { useAppQueryParams } from "../../hooks/hooks";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isLoaded, isLoading, Loadable, loading } from "../../types/Loadable";
import { AllergenName } from "../../types/identifiers";
import { AllergenSuppressionState } from "../../types/AllergySuppressionSetting";
import { isEmpty, mapValues } from "lodash";
import { Col, Form, Spinner } from "react-bootstrap";
import { objectEntries } from "../../utils/recordUtils";
import { grammaticalList } from "../../utils/stringUtils";
import { AllergySuppressionSettingDto, RuleSettingsController } from "@api";

import { logger } from "../../utils/logger";
const UPDATE_ALLERGY_SUPPRESSION_SETTINGS_DEBOUNCE_INTERVAL_MS = 1000;

export function AllergySettingsTab() {
  const { patientId, caseId, tenantId } = useAppQueryParams();

  const [suppressedAllergies, setSuppressedAllergies] = useState<
    Loadable<Record<AllergenName, AllergySuppressionSettingDto>>
  >(loading());

  useEffect(() => {
    RuleSettingsController.getAllergySuppressionSettings({
      path: {
        patientId,
        caseId,
      },
    }).then((it) => it.data && setSuppressedAllergies(it.data));
  }, [caseId, patientId, tenantId]);

  // Some subtlety: this is to debounce the call to updateAllergySuppressionSettings,
  // but we want to make sure we still update even if the user closes the settings modal before the time expires.
  // useDebouncedCallback doesn't have this property, so we are rolling our own here
  const timerRef = useRef<number | null>(null);
  // useRef to avoid useTimeout capturing stale values
  const suppressedAllergiesRef =
    useRef<Loadable<Record<AllergenName, AllergySuppressionSettingDto>>>(
      suppressedAllergies,
    );
  useEffect(() => {
    suppressedAllergiesRef.current = suppressedAllergies;
  }, [suppressedAllergies]);

  const scheduleUpdateAllergySettings = useCallback(() => {
    logger.debug("updateAllergySuppressionSettings: scheduling");
    // Clear any existing timeout using ref
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    const timerHandle = setTimeout((_) => {
      if (isLoaded(suppressedAllergiesRef.current)) {
        const payload = mapValues(
          suppressedAllergiesRef.current,
          "suppressionState",
        );
        logger.debug("updateAllergySuppressionSettings: invoking ", payload);
        RuleSettingsController.setAllergySuppressionSettings({
          path: {
            patientId,
            caseId,
          },
          body: payload,
        });
      }
      timerRef.current = null;
    }, UPDATE_ALLERGY_SUPPRESSION_SETTINGS_DEBOUNCE_INTERVAL_MS);
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

  return (
    <div className="mt-2">
      {isLoading(suppressedAllergies) ? (
        <Spinner />
      ) : objectEntries(suppressedAllergies).length === 0 ? (
        "Patient has no known allergies"
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
            Disabling an allergen removes all associated allergy alerts for this
            case.
          </Col>
          {objectEntries(suppressedAllergies).map(([allergyName, setting]) => (
            <AllergySuppressionToggle
              key={allergyName}
              allergyName={allergyName}
              reactions={setting.reactions}
              status={setting.suppressionState}
              onStatusChanged={(status) => {
                setSuppressedAllergies({
                  ...suppressedAllergies,
                  [allergyName]: {
                    ...suppressedAllergies[allergyName],
                    suppressionState: status,
                  },
                });
                scheduleUpdateAllergySettings();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AllergySuppressionToggle({
  allergyName,
  reactions,
  status,
  onStatusChanged,
  disabled = false,
}: {
  allergyName: AllergenName;
  reactions: string[];
  status: AllergenSuppressionState;
  onStatusChanged: (status: AllergenSuppressionState) => void;
  disabled?: boolean;
}) {
  function formatReaction(s: string): string {
    return s
      .toLowerCase()
      .split(" ")
      .map((it) => (it == "gi" ? "GI" : it[0].toUpperCase() + it.slice(1)))
      .join(" ");
  }

  const label = useMemo(() => {
    if (isEmpty(reactions)) {
      return <div>{allergyName}</div>;
    }
    if (reactions.length === 1) {
      return (
        <div>
          {allergyName} with reaction: {formatReaction(reactions[0])}
        </div>
      );
    }
    return (
      <div>
        {allergyName} with reactions:{" "}
        {grammaticalList(reactions.map((reaction) => formatReaction(reaction)))}
      </div>
    );
  }, [allergyName, reactions]);

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
        id={`toggle-allergy-${allergyName}`}
        label={label}
        onChange={(e) =>
          onStatusChanged(e.currentTarget.checked ? "NORMAL" : "SUPPRESSED")
        }
        disabled={disabled}
        checked={status === "NORMAL"}
      />
    </Col>
  );
}
