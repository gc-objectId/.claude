import {
  Button,
  Col,
  Modal,
  OverlayTrigger,
  Row,
  Spinner,
  Stack,
  Table,
  Tooltip,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faKeyboard,
  faList,
  faPencil,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { DateTime } from "luxon";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Field,
  FieldArray,
  FieldArrayRenderProps,
  Form,
  Formik,
  useFormikContext,
} from "formik";
import { DatePickerField } from "../../../Form/DatePickerField";
import BSForm from "react-bootstrap/Form";
import type { MedicationWithConcentrations } from "@api";
import { isEmpty, sortBy } from "lodash";
import { InfusionVisualizationModal } from "./InfusionVisualizationModal";
import { CopyableIdentifier } from "../../CopyableIdentifier";
import {
  getMedicationRouteLabel,
  MedicationRoute,
} from "../../../../types/MedicationRoute";
import { useMutation } from "@tanstack/react-query";
import { saveBolusMedicationAdministrationMutation } from "@api/@tanstack/react-query.gen";
import {
  Concentration,
  InfusionEventDto,
  InfusionMedAdminDebugController,
  MedicationAdministrationDto,
  PatientController,
} from "@api";
import toast from "react-hot-toast";
import {
  CaseID,
  MedicationAdministrationID,
  PatientID,
} from "../../../../types/identifiers";

import { logger } from "../../../../utils/logger";
export type MedicationAdministrationListingProps = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

export function MedicationAdministrationTab({
  context,
  isActive,
}: MedicationAdministrationListingProps) {
  return (
    <div>
      <MedAdminList context={context} isActive={isActive} />
    </div>
  );
}

type AddInfusionBody = {
  medicationId: string;
  events: InfusionEventDto[];
  concentrationOptionIndex?: number;
  route?: MedicationRoute;
};

type AddBolusBody = {
  medicationId: string;
  administrationDate: Date;
  doseAmount: string;
  doseUnits: string;
  concentrationOptionIndex?: number;
  route?: MedicationRoute;
};

interface InfusionEditorProps {
  patientId: PatientID;
  caseId: CaseID;
  show: boolean;
  onHide: () => void;
  reload?: () => Promise<void>;
  target?: MedicationAdministrationDto;
}

interface RouteSelectorProps {
  medications: MedicationWithConcentrations[];
  isSubmitting: boolean;
  freeForm?: boolean;
}

function RouteSelector({
  medications,
  isSubmitting,
  freeForm,
}: RouteSelectorProps) {
  const { values, setFieldValue } = useFormikContext<AddInfusionBody>();

  // Get available routes for selected medication
  const availableRoutes = useMemo(() => {
    if (!values.medicationId) return [];

    const selectedMedication = medications.find(
      (m) => m.medicationIdentifier === values.medicationId,
    );

    return selectedMedication?.availableRoutes || [];
  }, [values.medicationId, medications]);

  // Handle route retention and fallback when medication changes (dropdown mode only)
  useEffect(() => {
    if (freeForm) return;
    if (medications.length === 0) return;

    if (!values.medicationId) {
      if (values.route) {
        setFieldValue("route", undefined);
      }
      return;
    }

    // If the medication isn't in the known list, leave the route alone —
    // the editor will switch to free-form mode and handle it there.
    const medicationKnown = medications.some(
      (m) => m.medicationIdentifier === values.medicationId,
    );
    if (!medicationKnown) return;

    if (availableRoutes.length === 0) {
      if (values.route) {
        setFieldValue("route", undefined);
      }
      return;
    }

    if (values.route && !availableRoutes.includes(values.route)) {
      setFieldValue("route", availableRoutes[0]);
    } else if (!values.route) {
      setFieldValue("route", availableRoutes[0]);
    }
  }, [
    freeForm,
    medications,
    values.medicationId,
    availableRoutes,
    values.route,
    setFieldValue,
  ]);

  if (freeForm) {
    const allRoutes = MedicationRoute.alternatives.map((a) => a.value);
    return (
      <BSForm.Group as={Row} className="mb-2">
        <BSForm.Label column sm="2">
          Route
        </BSForm.Label>
        <Col sm="10">
          <Field
            as="select"
            name="route"
            className="form-select"
            disabled={isSubmitting}
          >
            <option value="">Select route...</option>
            {allRoutes.map((route) => (
              <option key={route} value={route}>
                {getMedicationRouteLabel(route)}
              </option>
            ))}
          </Field>
        </Col>
      </BSForm.Group>
    );
  }

  if (!values.medicationId) {
    return (
      <BSForm.Group as={Row} className="mb-2">
        <BSForm.Label column sm="2">
          Route
        </BSForm.Label>
        <Col sm="10">
          <Field
            as="select"
            name="route"
            className="form-select"
            disabled={true}
          >
            <option value="">Select medication first...</option>
          </Field>
        </Col>
      </BSForm.Group>
    );
  }

  if (availableRoutes.length === 0) {
    return (
      <BSForm.Group as={Row} className="mb-2">
        <BSForm.Label column sm="2">
          Route
        </BSForm.Label>
        <Col sm="10">
          <Field
            as="select"
            name="route"
            className="form-select"
            disabled={true}
          >
            <option value="">No routes available for this medication</option>
          </Field>
        </Col>
      </BSForm.Group>
    );
  }

  return (
    <BSForm.Group as={Row} className="mb-2">
      <BSForm.Label column sm="2">
        Route
      </BSForm.Label>
      <Col sm="10">
        <Field
          as="select"
          name="route"
          className="form-select"
          disabled={isSubmitting}
        >
          <option value="">Select route...</option>
          {availableRoutes.map((route) => (
            <option key={route} value={route}>
              {getMedicationRouteLabel(route)}
            </option>
          ))}
        </Field>
      </Col>
    </BSForm.Group>
  );
}

function InfusionEditor({
  patientId,
  caseId,
  reload,
  target,
  show,
  onHide,
}: InfusionEditorProps) {
  const [medications, setMedications] = useState<
    MedicationWithConcentrations[]
  >([]);
  const [freeFormMedId, setFreeFormMedId] = useState(false);
  const getMedications = async function () {
    logger.debug("getting medications");
    const { data } =
      await InfusionMedAdminDebugController.getMedicationsWithConcentrations();
    if (data) {
      setMedications(data);
    }
  };

  useEffect(() => {
    getMedications();
  }, []);

  useEffect(() => {
    if (!target?.medicationIdentifier || medications.length === 0) return;
    const isInList = medications.some(
      (m) => m.medicationIdentifier === target.medicationIdentifier,
    );
    setFreeFormMedId(!isInList);
  }, [target, medications]);

  // Helper function to find the concentration option index for existing infusions
  const findConcentrationOptionIndex = useCallback(
    (
      medicationId: string,
      existingConcentrations: Concentration[],
    ): number | undefined => {
      if (isEmpty(existingConcentrations)) {
        return undefined;
      }

      const medication = medications.find(
        (m) => m.medicationIdentifier === medicationId,
      );
      if (!medication || !medication.concentrationOptions) {
        return undefined;
      }

      // Find which concentration option matches the existing concentrations
      for (let i = 0; i < medication.concentrationOptions.length; i++) {
        const option = medication.concentrationOptions[i];
        if (
          option.concentrations &&
          option.concentrations.length === existingConcentrations.length
        ) {
          // Simple comparison - could be enhanced with more sophisticated matching
          const matches = option.concentrations.every(
            (concentration, idx) =>
              existingConcentrations[idx] &&
              concentration.amount === existingConcentrations[idx].amount &&
              concentration.unit === existingConcentrations[idx].unit,
          );
          if (matches) {
            return i;
          }
        }
      }
      return undefined;
    },
    [medications],
  );

  return (
    <div>
      <Modal show={show} onHide={() => onHide()}>
        <Modal.Header closeButton>
          <Modal.Title>
            {target === undefined ? "Create" : "Edit"} infusion
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={
              target === undefined
                ? ({
                    medicationId: "",
                    events: [],
                    route: undefined,
                  } as AddInfusionBody)
                : ({
                    medicationId: target.medicationIdentifier,
                    concentrationOptionIndex:
                      target.medicationIdentifier &&
                      findConcentrationOptionIndex(
                        target.medicationIdentifier,
                        target.concentrations,
                      ),
                    route: target.route as MedicationRoute,
                    events: (target.infusionEvents || []).map((it) => ({
                      eventType: it.eventType,
                      eventDate: it.eventDate,
                      rateAmount: it.rateAmount,
                      rateUnits: it.rateUnits,
                      doseAmount: it.doseAmount,
                      doseUnits: it.doseUnits,
                    })),
                  } as AddInfusionBody)
            }
            onSubmit={async (values, helpers) => {
              helpers.setSubmitting(true);
              const response =
                await InfusionMedAdminDebugController.saveInfusionMedicationAdministration(
                  {
                    path: {
                      patientId,
                      caseId,
                    },
                    body: {
                      ...values,
                      medAdminId: target?.id as
                        | MedicationAdministrationID
                        | undefined,
                    },
                  },
                );
              helpers.setSubmitting(false);
              if (response.error) {
                toast.error("Unable to save infusion\n" + response.error);
                console.error("Unable to save infusion", response.error);
              } else {
                onHide();
              }
              reload?.();
            }}
          >
            {({ values, isSubmitting }) => (
              <Form>
                <BSForm.Group as={Row} className="mb-2">
                  <BSForm.Label column sm="2">
                    MedID
                  </BSForm.Label>
                  <Col sm="9">
                    {freeFormMedId ? (
                      <Field
                        className="form-control"
                        placeholder="Enter medication ID..."
                        name="medicationId"
                        required
                        disabled={isSubmitting}
                      />
                    ) : (
                      <Field
                        as="select"
                        required
                        name="medicationId"
                        className="form-select"
                        disabled={isSubmitting}
                      >
                        <option />
                        {medications.map((medication) => {
                          return (
                            <option
                              key={medication.medicationIdentifier}
                              value={medication.medicationIdentifier}
                            >
                              {medication.medicationName}{" "}
                              {medication.medicationIdentifier.startsWith("g-")
                                ? ` (${medication.medicationIdentifier})`
                                : ""}
                            </option>
                          );
                        })}
                      </Field>
                    )}
                  </Col>
                  <Col sm="1" className="d-flex align-items-center">
                    <FontAwesomeIcon
                      cursor="pointer"
                      icon={freeFormMedId ? faList : faKeyboard}
                      onClick={() => setFreeFormMedId((v) => !v)}
                      title={
                        freeFormMedId
                          ? "Switch to dropdown"
                          : "Enter custom medication ID"
                      }
                    />
                  </Col>
                </BSForm.Group>
                {/* Concentration Options */}
                {values.medicationId &&
                  (() => {
                    const selectedMedication = medications.find(
                      (m) => m.medicationIdentifier === values.medicationId,
                    );
                    const concentrationOptions =
                      selectedMedication?.concentrationOptions || [];

                    if (concentrationOptions.length > 0) {
                      return (
                        <BSForm.Group as={Row} className="mb-2">
                          <BSForm.Label column sm="4">
                            Concentration
                          </BSForm.Label>
                          <Col sm="8">
                            <Field
                              as="select"
                              required
                              name="concentrationOptionIndex"
                              className="form-select"
                              disabled={isSubmitting}
                            >
                              <option value="">Select concentration...</option>
                              {concentrationOptions.map((option, index) => (
                                <option key={index} value={index}>
                                  {option.label || `Option ${index + 1}`}
                                </option>
                              ))}
                            </Field>
                          </Col>
                        </BSForm.Group>
                      );
                    }
                    return null;
                  })()}

                {/* Route Selection */}
                <RouteSelector
                  medications={medications}
                  isSubmitting={isSubmitting}
                  freeForm={freeFormMedId}
                />
                <FieldArray
                  name="events"
                  render={(arrayHelpers: FieldArrayRenderProps) => (
                    <div>
                      {values.events.map((event, index) => (
                        <div key={index} className=" border-top border-1 pt-2">
                          <Row className="mb-2">
                            <Col sm="1" className="border-end border-1">
                              <FontAwesomeIcon
                                cursor="pointer"
                                onClick={() => {
                                  arrayHelpers.remove(index);
                                }}
                                title="remove event"
                                icon={faTrash}
                              />
                            </Col>
                            <Col>
                              <BSForm.Group as={Row} className="mb-2">
                                <BSForm.Label column sm="2">
                                  Type
                                </BSForm.Label>
                                <Col sm="10">
                                  <Field
                                    as="select"
                                    required
                                    name={`events.${index}.eventType`}
                                    className="form-select"
                                    disabled={isSubmitting}
                                  >
                                    <option value="">Select...</option>
                                    <option value="START">Start</option>
                                    <option value="STOP">Stop</option>
                                    <option value="RATE_CHANGE">
                                      Rate change
                                    </option>
                                  </Field>
                                </Col>
                              </BSForm.Group>
                              <BSForm.Group as={Row} className="mb-2">
                                <BSForm.Label column sm="2">
                                  Date
                                </BSForm.Label>
                                <Col sm="10">
                                  <DatePickerField
                                    dateFormat="Pp"
                                    showTimeSelect
                                    required
                                    className="form-control"
                                    name={`events.${index}.eventDate`}
                                    disabled={isSubmitting}
                                  />
                                </Col>
                              </BSForm.Group>

                              {event.eventType !== "STOP" && (
                                <>
                                  <div>
                                    <BSForm.Group as={Row} className="mb-2">
                                      <BSForm.Label column sm="2">
                                        Rate
                                      </BSForm.Label>
                                      <Col sm="5">
                                        <Field
                                          className="form-control"
                                          placeholder="eg: 45"
                                          name={`events.${index}.rateAmount`}
                                          disabled={isSubmitting}
                                        />
                                      </Col>
                                      <Col sm="5">
                                        <Field
                                          className="form-control"
                                          placeholder="eg: mL/hr"
                                          name={`events.${index}.rateUnits`}
                                          disabled={isSubmitting}
                                        />
                                      </Col>
                                    </BSForm.Group>
                                  </div>

                                  <div>
                                    <BSForm.Group as={Row}>
                                      <BSForm.Label column sm="2">
                                        Dose
                                      </BSForm.Label>
                                      <Col sm="5">
                                        <Field
                                          className="form-control"
                                          placeholder="eg: 60"
                                          name={`events.${index}.doseAmount`}
                                          disabled={isSubmitting}
                                        />
                                      </Col>
                                      <Col sm="5">
                                        <Field
                                          className="form-control"
                                          placeholder="eg: mcg/min"
                                          name={`events.${index}.doseUnits`}
                                          disabled={isSubmitting}
                                        />
                                      </Col>
                                    </BSForm.Group>
                                  </div>
                                </>
                              )}
                            </Col>
                          </Row>
                        </div>
                      ))}
                      <Row>
                        <Col className="d-flex justify-content-start">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              arrayHelpers.push({ event: "", ts: new Date() });
                            }}
                            disabled={isSubmitting}
                          >
                            + event
                          </Button>
                        </Col>
                        <Col className="d-flex justify-content-end">
                          <Button
                            variant="primary"
                            type="submit"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? <Spinner /> : "Save"}
                          </Button>
                        </Col>
                      </Row>
                    </div>
                  )}
                />
              </Form>
            )}
          </Formik>
        </Modal.Body>
      </Modal>
    </div>
  );
}

interface BolusEditorProps {
  patientId: PatientID;
  caseId: CaseID;
  show: boolean;
  onHide: () => void;
  reload?: () => Promise<void>;
  target?: MedicationAdministrationDto;
}

interface DoseUnitsSelectorProps {
  medications: MedicationWithConcentrations[];
  isSubmitting: boolean;
}

function DoseUnitsSelector({
  medications,
  isSubmitting,
}: DoseUnitsSelectorProps) {
  const { values, setFieldValue } = useFormikContext<AddBolusBody>();

  // Auto-populate dose units based on selected medication and route
  useEffect(() => {
    if (!values.medicationId || !values.route) {
      return;
    }

    const selectedMedication = medications.find(
      (m) => m.medicationIdentifier === values.medicationId,
    );

    if (!selectedMedication?.routeDoseUnits) {
      return;
    }

    const doseUnitsForRoute = selectedMedication.routeDoseUnits[values.route];
    if (doseUnitsForRoute && doseUnitsForRoute.units) {
      // Auto-populate dose units when route changes
      setFieldValue("doseUnits", doseUnitsForRoute.units);
    }
  }, [values.medicationId, values.route, medications, setFieldValue]);

  return (
    <Field
      className="form-control"
      placeholder="eg: mg"
      name="doseUnits"
      required
      disabled={isSubmitting}
    />
  );
}

function BolusEditor({
  patientId,
  caseId,
  reload,
  target,
  show,
  onHide,
}: BolusEditorProps) {
  const [medications, setMedications] = useState<
    MedicationWithConcentrations[]
  >([]);
  const [freeFormMedId, setFreeFormMedId] = useState(false);
  const getMedications = async function () {
    logger.debug("getting medications");
    const { data } =
      await InfusionMedAdminDebugController.getMedicationsWithConcentrations();
    if (data) {
      setMedications(data);
    }
  };

  useEffect(() => {
    getMedications();
  }, []);

  useEffect(() => {
    if (!target?.medicationIdentifier || medications.length === 0) return;
    const isInList = medications.some(
      (m) => m.medicationIdentifier === target.medicationIdentifier,
    );
    setFreeFormMedId(!isInList);
  }, [target, medications]);

  const saveBolusMutation = useMutation({
    ...saveBolusMedicationAdministrationMutation(),
    onSuccess: () => {
      onHide();
      reload?.();
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || "Unknown error";
      alert(`Error saving bolus: ${errorMessage}`);
    },
  });

  // Helper function to find the concentration option index for existing bolus
  const findConcentrationOptionIndex = useCallback(
    (
      medicationId: string,
      existingConcentrations: Concentration[],
    ): number | undefined => {
      if (isEmpty(existingConcentrations)) {
        return undefined;
      }

      const medication = medications.find(
        (m) => m.medicationIdentifier === medicationId,
      );
      if (!medication || !medication.concentrationOptions) {
        return undefined;
      }

      // Find which concentration option matches the existing concentrations
      for (let i = 0; i < medication.concentrationOptions.length; i++) {
        const option = medication.concentrationOptions[i];
        if (
          option.concentrations &&
          option.concentrations.length === existingConcentrations.length
        ) {
          const matches = option.concentrations.every(
            (concentration, idx) =>
              existingConcentrations[idx] &&
              concentration.amount === existingConcentrations[idx].amount &&
              concentration.unit === existingConcentrations[idx].unit,
          );
          if (matches) {
            return i;
          }
        }
      }
      return undefined;
    },
    [medications],
  );

  return (
    <div>
      <Modal show={show} onHide={() => onHide()}>
        <Modal.Header closeButton>
          <Modal.Title>
            {target === undefined ? "Create" : "Edit"} bolus
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={
              target === undefined
                ? ({
                    medicationId: "",
                    administrationDate: new Date(),
                    doseAmount: "",
                    doseUnits: "",
                    route: undefined,
                  } as AddBolusBody)
                : ({
                    medicationId: target.medicationIdentifier,
                    administrationDate: target.administrationDate
                      ? new Date(target.administrationDate)
                      : new Date(),
                    doseAmount: target.doseAmount?.toString() || "",
                    doseUnits: target.doseUnits || "",
                    concentrationOptionIndex:
                      target.medicationIdentifier &&
                      findConcentrationOptionIndex(
                        target.medicationIdentifier,
                        target.concentrations,
                      ),
                    route: target.route as MedicationRoute,
                  } as AddBolusBody)
            }
            onSubmit={async (values, helpers) => {
              saveBolusMutation.mutate({
                path: {
                  patientId,
                  caseId,
                },
                body: {
                  medicationId: values.medicationId,
                  administrationDate: values.administrationDate.toISOString(),
                  doseAmount: values.doseAmount,
                  doseUnits: values.doseUnits,
                  route: values.route,
                  concentrationOptionIndex: values.concentrationOptionIndex,
                  medAdminId: target?.id,
                },
              });
            }}
          >
            {({ values }) => {
              const isSubmitting = saveBolusMutation.isPending;
              return (
                <Form>
                  <BSForm.Group as={Row} className="mb-2">
                    <BSForm.Label column sm="2">
                      MedID
                    </BSForm.Label>
                    <Col sm="9">
                      {freeFormMedId ? (
                        <Field
                          className="form-control"
                          placeholder="Enter medication ID..."
                          name="medicationId"
                          required
                          disabled={isSubmitting}
                        />
                      ) : (
                        <Field
                          as="select"
                          required
                          name="medicationId"
                          className="form-select"
                          disabled={isSubmitting}
                        >
                          <option />
                          {medications.map((medication) => {
                            return (
                              <option
                                key={medication.medicationIdentifier}
                                value={medication.medicationIdentifier}
                              >
                                {medication.medicationName}{" "}
                                {medication.medicationIdentifier.startsWith(
                                  "g-",
                                )
                                  ? ` (${medication.medicationIdentifier})`
                                  : ""}
                              </option>
                            );
                          })}
                        </Field>
                      )}
                    </Col>
                    <Col sm="1" className="d-flex align-items-center">
                      <FontAwesomeIcon
                        cursor="pointer"
                        icon={freeFormMedId ? faList : faKeyboard}
                        onClick={() => setFreeFormMedId((v) => !v)}
                        title={
                          freeFormMedId
                            ? "Switch to dropdown"
                            : "Enter custom medication ID"
                        }
                      />
                    </Col>
                  </BSForm.Group>
                  {/* Concentration Options */}
                  {values.medicationId &&
                    (() => {
                      const selectedMedication = medications.find(
                        (m) => m.medicationIdentifier === values.medicationId,
                      );
                      const concentrationOptions =
                        selectedMedication?.concentrationOptions || [];

                      if (concentrationOptions.length > 0) {
                        return (
                          <BSForm.Group as={Row} className="mb-2">
                            <BSForm.Label column sm="4">
                              Concentration
                            </BSForm.Label>
                            <Col sm="8">
                              <Field
                                as="select"
                                required
                                name="concentrationOptionIndex"
                                className="form-select"
                                disabled={isSubmitting}
                              >
                                <option value="">
                                  Select concentration...
                                </option>
                                {concentrationOptions.map((option, index) => (
                                  <option key={index} value={index}>
                                    {option.label || `Option ${index + 1}`}
                                  </option>
                                ))}
                              </Field>
                            </Col>
                          </BSForm.Group>
                        );
                      }
                      return null;
                    })()}

                  {/* Route Selection */}
                  <RouteSelector
                    medications={medications}
                    isSubmitting={isSubmitting}
                    freeForm={freeFormMedId}
                  />

                  {/* Administration Date */}
                  <BSForm.Group as={Row} className="mb-2">
                    <BSForm.Label column sm="4">
                      Admin Date
                    </BSForm.Label>
                    <Col sm="8">
                      <DatePickerField
                        dateFormat="Pp"
                        showTimeSelect
                        required
                        className="form-control"
                        name="administrationDate"
                        disabled={isSubmitting}
                      />
                    </Col>
                  </BSForm.Group>

                  {/* Dose */}
                  <BSForm.Group as={Row} className="mb-2">
                    <BSForm.Label column sm="2">
                      Dose
                    </BSForm.Label>
                    <Col sm="5">
                      <Field
                        className="form-control"
                        placeholder="eg: 60"
                        name="doseAmount"
                        required
                        disabled={isSubmitting}
                      />
                    </Col>
                    <Col sm="5">
                      <DoseUnitsSelector
                        medications={medications}
                        isSubmitting={isSubmitting}
                      />
                    </Col>
                  </BSForm.Group>

                  <Row>
                    <Col className="d-flex justify-content-end">
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Spinner /> : "Save"}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              );
            }}
          </Formik>
        </Modal.Body>
      </Modal>
    </div>
  );
}

function MedAdminList({
  context,
  isActive,
}: MedicationAdministrationListingProps) {
  const [showInfusionEditor, setShowInfusionEditor] = useState<boolean>(false);
  const [targetInfusion, setTargetInfusion] =
    useState<MedicationAdministrationDto>();
  const [showInfusionVisualization, setShowInfusionVisualization] =
    useState<boolean>(false);
  const [visualizationTarget, setVisualizationTarget] =
    useState<MedicationAdministrationDto | null>(null);

  const [showBolusEditor, setShowBolusEditor] = useState<boolean>(false);
  const [targetBolus, setTargetBolus] = useState<MedicationAdministrationDto>();

  const editInfusion = useCallback((medAdmin: MedicationAdministrationDto) => {
    setTargetInfusion(medAdmin);
    setShowInfusionEditor(true);
  }, []);

  const createInfusion = useCallback(() => {
    setTargetInfusion(undefined);
    setShowInfusionEditor(true);
  }, []);

  const editBolus = useCallback((medAdmin: MedicationAdministrationDto) => {
    setTargetBolus(medAdmin);
    setShowBolusEditor(true);
  }, []);

  const createBolus = useCallback(() => {
    setTargetBolus(undefined);
    setShowBolusEditor(true);
  }, []);

  const visualizeInfusion = useCallback(
    (medAdmin: MedicationAdministrationDto) => {
      setVisualizationTarget(medAdmin);
      setShowInfusionVisualization(true);
    },
    [],
  );

  const [medicationAdministrations, setMedicationAdministrations] = useState<
    MedicationAdministrationDto[]
  >([]);

  const handleRemoveMedication = useCallback(
    (medicationToDelete: MedicationAdministrationDto) => {
      setMedicationAdministrations((prevState) =>
        prevState.filter(
          (medication) => medication.id !== medicationToDelete.id,
        ),
      );
    },
    [],
  );

  const loadMedications = useCallback(async () => {
    logger.debug("loading meds");
    const response = await PatientController.getMedicationAdministrations({
      path: {
        caseId: context.operation.caseId,
        patientId: context.patient.pmrn,
      },
    });
    if (response.data) {
      setMedicationAdministrations(response.data);
    } else if (response.error) {
      toast.error("Failed to get medication administrations");
      console.error(
        "Failed to get medication administrations:",
        response.error,
      );
    }
  }, [context.operation.caseId, context.patient.pmrn]);

  useEffect(() => {
    if (isActive) loadMedications();
  }, [loadMedications, isActive]);

  const removeMedicationAdministration = useCallback(
    async (administration: MedicationAdministrationDto) => {
      await PatientController.deleteMedicationAdministration({
        path: {
          medicationAdministrationId: administration.id,
          type: administration.type,
        },
      });
      handleRemoveMedication(administration);
    },
    [handleRemoveMedication],
  );

  const removeAllMedicationAdministrations = useCallback(async () => {
    for (let medicationAdministration of medicationAdministrations) {
      await removeMedicationAdministration(medicationAdministration);
    }
  }, [removeMedicationAdministration, medicationAdministrations]);

  return (
    <div>
      <Stack direction="horizontal" gap={2} className="mb-3">
        <Button onClick={() => createBolus()}>Add bolus</Button>
        <Button onClick={() => createInfusion()}>Add infusion</Button>
      </Stack>
      <BolusEditor
        patientId={context.patient.pmrn}
        caseId={context.operation.caseId}
        reload={loadMedications}
        target={targetBolus}
        show={showBolusEditor}
        onHide={() => setShowBolusEditor(false)}
      />
      <InfusionEditor
        patientId={context.patient.pmrn}
        caseId={context.operation.caseId}
        reload={loadMedications}
        target={targetInfusion}
        show={showInfusionEditor}
        onHide={() => setShowInfusionEditor(false)}
      />
      <InfusionVisualizationModal
        show={showInfusionVisualization}
        onHide={() => setShowInfusionVisualization(false)}
        infusion={visualizationTarget}
      />
      Count: {medicationAdministrations.length}
      <div className="d-flex flex-row-reverse mb-3">
        <Button
          variant="danger"
          className="mb-3"
          onClick={() => removeAllMedicationAdministrations()}
        >
          <FontAwesomeIcon icon={faTrash} /> <span>Delete All</span>
        </Button>
      </div>
      <Table striped bordered hover id="medication-administrations">
        <thead>
          <tr>
            <th>ID</th>
            <th>Order ID</th>
            <th>Medication Identifier</th>
            <th>Medication</th>
            <th>Type</th>
            <th>Administration</th>
            <th>Source</th>
            <th>Route</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {medicationAdministrations.map((medication, index) => {
            return (
              <tr key={medication.id + "-" + index}>
                <td>
                  <OverlayTrigger
                    overlay={
                      <Tooltip>
                        Created:{" "}
                        {DateTime.fromISO(
                          medication.createdDate,
                        ).toLocaleString(DateTime.DATETIME_SHORT)}
                        <br />
                        Last Updated:{" "}
                        {DateTime.fromISO(
                          medication.lastModifiedDate,
                        ).toLocaleString(DateTime.DATETIME_SHORT)}
                      </Tooltip>
                    }
                  >
                    <span>
                      <CopyableIdentifier value={medication.id} />
                    </span>
                  </OverlayTrigger>
                </td>
                <td>
                  <CopyableIdentifier value={medication.orderId} />
                </td>
                <td>{medication.medicationIdentifier}</td>
                <td>{medication.medicationName}</td>
                <td>{medication.type}</td>
                <td>
                  <AdministrationDisplay
                    medAdmin={medication}
                    onInfusionClicked={() => visualizeInfusion(medication)}
                  />
                </td>
                <td>{formatSourceType(medication.sourceType)}</td>
                <td>{medication.route}</td>
                <td>
                  <Stack direction="vertical" gap={2}>
                    {medication.type === "INFUSION" ? (
                      <>
                        <FontAwesomeIcon
                          cursor="pointer"
                          icon={faChartLine}
                          onClick={() => {
                            visualizeInfusion(medication);
                          }}
                          className="text-info border-bottom pb-2"
                          title="visualize dosing"
                        />
                        <FontAwesomeIcon
                          cursor="pointer"
                          icon={faPencil}
                          onClick={() => {
                            editInfusion(medication);
                          }}
                          className="border-bottom pb-2"
                          title="edit"
                        />
                      </>
                    ) : (
                      <FontAwesomeIcon
                        cursor="pointer"
                        icon={faPencil}
                        onClick={() => {
                          editBolus(medication);
                        }}
                        className="border-bottom pb-2"
                        title="edit"
                      />
                    )}

                    <FontAwesomeIcon
                      cursor="pointer"
                      icon={faTrash}
                      onClick={(e) =>
                        removeMedicationAdministration(medication)
                      }
                      className="text-danger"
                      title="delete"
                    />
                  </Stack>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

function AdministrationDisplay({
  medAdmin,
  onInfusionClicked,
}: {
  medAdmin: MedicationAdministrationDto;
  onInfusionClicked: () => void;
}) {
  if (medAdmin.type == "INFUSION") {
    if (medAdmin.infusionEvents?.length === 0) {
      return <span>No events</span>;
    }
    const sortedEvents = sortBy(medAdmin.infusionEvents, "eventDate");
    const firstEvent = sortedEvents[0];
    return (
      <div>
        <div>
          {firstEvent.eventType} -{" "}
          <span className="text-nowrap">
            {!!firstEvent.eventDate
              ? DateTime.fromISO(firstEvent.eventDate).toLocaleString(
                  DateTime.DATETIME_SHORT,
                )
              : "missing date"}
          </span>
          <br />
          <span className="text-nowrap">
            {firstEvent.doseAmount} {firstEvent.doseUnits}
          </span>
        </div>
        {sortedEvents.length > 1 && (
          <div className="pointer" onClick={onInfusionClicked}>
            <i>and {sortedEvents.length - 1} more</i>
          </div>
        )}
      </div>
    );
  } else {
    return (
      <span>
        {medAdmin.doseAmount} {medAdmin.doseUnits} {" @ "}{" "}
        <span className="text-nowrap">
          {medAdmin.administrationDate &&
            DateTime.fromISO(medAdmin.administrationDate).toLocaleString(
              DateTime.DATETIME_SHORT,
            )}
        </span>
      </span>
    );
  }
}

function formatSourceType(sourceType: string | null): string {
  if (sourceType === "APPLICATION") return "GuidedOR";
  if (sourceType === "EMR") return "EHR";
  if (sourceType === "OTHER") return "Other";
  return 'Unknown: "' + sourceType + '"';
}
