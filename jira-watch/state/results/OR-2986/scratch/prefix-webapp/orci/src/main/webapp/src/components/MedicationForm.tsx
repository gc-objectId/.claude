import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logger } from "../utils/logger";
import { Alert, Col, Container, Row } from "react-bootstrap";
import Select, { createFilter, CSSObjectWithLabel } from "react-select";
import { useQuery } from "@tanstack/react-query";
import { getMedicationsOptions } from "@api/@tanstack/react-query.gen";
import { CaseID, PatientID, TenantID } from "../types/identifiers";
import PatientService from "../services/PatientService";
import { APIUnknownError } from "../errors/APIError";

type Option = {
  value: string;
  label: string;
};

export type MedicationFormProps = {
  patientId: PatientID;
  caseId: CaseID;
  clientId: TenantID;
  medicationSelection(data: unknown): void;
  medicationScanError: string;
  onMedicationDropdownSelect(): void;
  onInvalidMedication(error: APIUnknownError): void;
  onDismissMedicationScanError?: () => void;
};

const MedicationForm = ({
  patientId,
  caseId,
  clientId,
  medicationSelection,
  medicationScanError,
  onMedicationDropdownSelect,
  onInvalidMedication,
  onDismissMedicationScanError,
}: MedicationFormProps) => {
  const { data: medications = [], error: medicationsError } = useQuery(
    getMedicationsOptions(),
  );
  useEffect(() => {
    if (medicationsError) {
      logger.error("Error getting medications", medicationsError);
    }
  }, [medicationsError]);
  const options = useMemo<Option[]>(
    () =>
      medications.map((medication) => ({
        value: medication.medicationIdentifier,
        label: medication.medicationName,
      })),
    [medications],
  );
  const [submitting, setSubmitting] = useState(false);
  const patientService = useMemo(() => new PatientService(), []);

  const handleFormSubmit = useCallback(
    async (medication: Option) => {
      setSubmitting(true);
      try {
        const response = await patientService.evaluateMedication({
          caseId,
          patientId,
          clientId,
          medicationIdentifier: medication.value,
        });
        response.caseOf({
          Left: (error) => {
            logger.warn("Error getting medication selection response", error);
            if (error instanceof APIUnknownError) {
              onInvalidMedication(error);
            } else {
              console.error("Unhandled error: " + error);
            }
          },
          Right: (data) => {
            if (!data) {
              logger.warn(
                "No data in medication selection response for " +
                  medication.value,
                response,
              );
            } else {
              logger.debug("Sending medication selection response: ", data);
              try {
                medicationSelection(data);
              } catch (e) {
                console.error("Error sending medication selection response", e);
              }
            }
          },
        });
      } finally {
        setSubmitting(false);
      }
    },
    [
      caseId,
      clientId,
      medicationSelection,
      onInvalidMedication,
      patientId,
      patientService,
    ],
  );

  return (
    <Container fluid="md">
      {medicationScanError && (
        <Row>
          <div className="d-flex justify-content-center">
            <Alert
              key="danger"
              variant="danger"
              dismissible={!!onDismissMedicationScanError}
              onClose={onDismissMedicationScanError}
            >
              {medicationScanError}
            </Alert>
          </div>
        </Row>
      )}
      <Row>
        <Col md={{ span: 8, offset: 2 }}>
          <div className="mb-3">
            <label id="medication-select-label" className="mb-2">
              Select Medication:
            </label>
            <MedicationPickerDropdown
              options={options}
              disabled={submitting}
              onSelect={async (selectedOption: Option) => {
                onMedicationDropdownSelect();
                await handleFormSubmit(selectedOption);
              }}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

function MedicationPickerDropdown({
  options,
  onSelect,
  disabled,
}: {
  options: Option[];
  onSelect: (v: Option) => Promise<void>;
  disabled: boolean;
}) {
  // configuration for react-select filtering
  const filterConfig = {
    ignoreCase: true,
    ignoreAccents: true,
    trim: true,
    matchFrom: "start" as const,
  };

  const selectRef = useRef<any>();

  return (
    <Select
      id="medication-select"
      aria-labelledby="medication-select-label"
      ref={selectRef}
      options={options}
      isDisabled={disabled}
      placeholder="Search..."
      openMenuOnFocus={false}
      openMenuOnClick={true}
      onMenuOpen={() => {
        setTimeout(() => {
          const { focusedOptionRef, menuListRef } = selectRef.current;
          if (!focusedOptionRef || !menuListRef) return;
          // vertically center the selected option
          scrollIntoView(menuListRef, focusedOptionRef);
        }, 10);
      }}
      theme={(theme) => ({
        ...theme,
        colors: {
          ...theme.colors,
          primary: "#1a1a1a",
        },
      })}
      styles={{
        menu: (base) => ({ ...base, zIndex: 9999 } as CSSObjectWithLabel),
        option: (base, { isSelected }) =>
          ({
            ...base,
            background: isSelected ? "#DEEBFF" : base.background,
            color: "black",
            fontWeight: isSelected ? "bold" : base.fontWeight,
          } as CSSObjectWithLabel),
        noOptionsMessage: (base) =>
          ({ ...base, textAlign: "left" } as CSSObjectWithLabel),
      }}
      onChange={async (value, { action }) => {
        if (value && action === "select-option" && onSelect) {
          await onSelect(value);
          selectRef.current?.clearValue();
        }
      }}
      noOptionsMessage={() => "No matching medications"}
      isClearable={true}
      filterOption={createFilter(filterConfig)}
    />
  );
}

// these are utility functions from react-select
// duplicated here because we want to have the focused option be in the center of the dropdown
// instead of at the end, which is the built-in behavior.
export function scrollIntoView(
  menuEl: HTMLElement,
  focusedEl: HTMLElement,
): void {
  const menuRect = menuEl.getBoundingClientRect();
  const focusedRect = focusedEl.getBoundingClientRect();
  const overScroll = focusedEl.offsetHeight / 3;

  if (focusedRect.bottom + overScroll > menuRect.bottom) {
    scrollTo(
      menuEl,
      Math.min(
        focusedEl.offsetTop +
          focusedEl.clientHeight -
          // added `/ 2` to scroll to vertical center
          menuEl.offsetHeight / 2 +
          overScroll,

        menuEl.scrollHeight,
      ),
    );
  } else if (focusedRect.top - overScroll < menuRect.top) {
    scrollTo(menuEl, Math.max(focusedEl.offsetTop - overScroll, 0));
  }
}

export function scrollTo(el: HTMLElement | typeof window, top: number): void {
  // with a scroll distance, we perform scroll on the element
  if (isDocumentElement(el)) {
    window.scrollTo(0, top);
    return;
  }

  el.scrollTop = top;
}

export function isDocumentElement(
  el: HTMLElement | typeof window,
): el is typeof window {
  return [document.documentElement, document.body, window].indexOf(el) > -1;
}

export default MedicationForm;
