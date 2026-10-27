import "./DosingForm.scss";

import { logger } from "../utils/logger";
import { useNow, useRuleSettings } from "../hooks/hooks";
import { isEmpty, isEqual, isNaN, isNil, keys, padStart, pickBy } from "lodash";
import { MouseEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Form, OverlayTrigger, Tooltip } from "react-bootstrap";

import GuidanceAlert from "./GuidanceAlert";
import {
  RuleExecutionResultService,
  submitRuleResponseErrorToRejectAlertResponse,
} from "../services/RuleExecutionResultService";
import { getMedicationLabelStyle } from "../utils/medicationLabelStyle";
import {
  CaseID,
  NDC,
  PatientID,
  TabID,
  TenantID,
  TrackingTabID,
  UserID,
} from "../types/identifiers";
import { ConcentrationOption } from "../types/ConcentrationOption";
import { MedicationRoute } from "../types/MedicationRoute";
import { DoseOption } from "../types/DoseOption";
import { DosingFormPayload } from "../types/DosingFormPayload";
import { RejectAlertPayload, RejectAlertResponse } from "./Alert/AlertBody";
import PatientService from "../services/PatientService";
import { ConcentrationButton, DoseButton } from "./DosingFormButtons";
import { isWeightBasedDoseOption } from "../utils/dosingForm/doseOptions";
import { Concentration } from "../types/Concentration";
import { RuleCitationContainer } from "./Alert/RuleCitationContainer";
import { DosingFormBanners } from "./dosing-form/DosingFormBanners";
import { TimeInput, useTimeInput } from "./dosing-form/TimeInput";
import { DoseInput } from "./dosing-form/DoseInput";
import type { OverlappingAdministrationsResponseDto } from "@api";
import { useOverlappingAdministrationCheck } from "../hooks/useOverlappingAdministrationCheck";
import {
  RestoreTabResolution,
  RestoreTabResolutionEnum,
} from "../types/RestoreTabResolution";
import { CitationsLocationEnum } from "../types/CitationsLocation";
import { DosingFormState } from "../types/DosingFormState";
import { AlertDefinition } from "../types/AlertDefinition";
import { MedicationSelectionContextProvider } from "../context/MedicationSelectionContext";
import { APIError } from "../errors/APIError";
import { SelectedMedication } from "../types/SelectedMedication";
import { useAuth } from "../context/AuthContext";
import { isAdmin } from "../types/User";
import { Patient } from "../types/Patient";
import { FeatureKeyEnum, useFeatureFlag } from "../hooks/useFeatureFlag";

export type DosingFormProps = {
  tabKey: TabID;
  tabIsSelected: boolean;
  patientId: PatientID;
  caseId: CaseID;
  userId: UserID;
  clientId: TenantID;
  medication: SelectedMedication;
  onDosingSave(
    p: DosingFormPayload,
    onSuccess: Function,
    onFailure: (e: APIError) => void,
  ): void;
  onDosingCancel(p: { tabKey: string; resolution: RestoreTabResolution }): void;
  dosingFormState: DosingFormState;
  trackingTabId: TrackingTabID;
  setCanCloseTab: (canCloseTab: boolean) => void;
  patient?: Patient;
  inductionTime?: Date | null;
};

function getDefaultDoseAmount(doseOptions: DoseOption[]): null | number {
  const defaultOption = doseOptions.filter((option) => option.defaultOption)[0];
  if (!defaultOption) {
    return null;
  } else {
    let amount = parseFloat(
      defaultOption.calculatedDoseAmount.replace(/,/g, ""),
    );
    if (amount) {
      return amount;
    }
  }
  return null;
}

const DosingForm = ({
  tabKey,
  tabIsSelected,
  patientId,
  caseId,
  userId,
  clientId,
  medication,
  onDosingSave,
  onDosingCancel,
  dosingFormState,
  trackingTabId,
  setCanCloseTab,
  patient,
  inductionTime,
}: DosingFormProps) => {
  const dosingFormOpenedAt = useRef<Date>(new Date());
  const useNewTimePicker = useFeatureFlag(FeatureKeyEnum.DOSING_TIME_PRESETS);
  const { user } = useAuth();
  const userIsAdmin = isAdmin(user);
  const [isLoading, setLoading] = useState(true);
  const [route, setRoute] = useState<MedicationRoute | "">("");
  const [selectedIndication, setSelectedIndication] = useState<string | "">("");
  const [concentrations, setConcentrations] = useState<Concentration[]>([]);
  const [availableDoseOptions, setAvailableDoseOptions] = useState<
    DoseOption[]
  >([]);

  const [availableConcentrationOptions, setAvailableConcentrationOptions] =
    useState<ConcentrationOption[]>([]);
  const [ndc, setNDC] = useState<NDC | "">("");
  const [ndcMutable, setNdcMutable] = useState<boolean>(true);
  const [saveEnabled, setSaveEnabled] = useState(false);

  const [saveAttemptFailed, setSaveAttemptFailed] = useState<boolean>(false);

  const [doseUnits, setDoseUnits] = useState<string>("");

  const [doseInputValue, setDoseInputValue] = useState<
    string | number | undefined
  >("");
  const validatedDoseAmount = useMemo<number>(
    () => Number(doseInputValue),
    [doseInputValue],
  );
  const [selectionAlerts, setSelectionAlerts] = useState<AlertDefinition[]>([]);

  const [dosingAlerts, setDosingAlerts] = useState<AlertDefinition[]>([]);
  const [validForm, setValidForm] = useState(false);
  const timeInput = useTimeInput(dosingFormOpenedAt.current);

  const [showErrors, setShowErrors] = useState(false);

  const [hideForm, setHideForm] = useState(false);
  const overlappingAdministration = useOverlappingAdministrationCheck(
    tabIsSelected,
    clientId,
    patientId,
    caseId,
    ndc === "" ? null : ndc,
    timeInput,
  );
  const alertContainerRef = useRef<HTMLDivElement>(null);
  const ruleSettings = useRuleSettings();

  const patientWeightKg = useMemo(() => {
    if (!patient) {
      return null;
    }
    const weight = Number(patient.weightValue);
    if (!Number.isFinite(weight) || weight <= 0) {
      return null;
    }
    const units = patient.weightUnits?.toLowerCase() ?? "";
    if (units !== "kg") {
      console.error("Expected weight in kg, was", units);
      return null;
    }
    return weight;
  }, [patient]);

  const isPediatricPatient = patient?.pediatricStatus === "PEDIATRIC";

  const doseIsInvalid =
    showErrors && (isNaN(validatedDoseAmount) || validatedDoseAmount <= 0);

  // would we ever get two dosing alerts for the same med?
  const ruleExecutionResultService = new RuleExecutionResultService();

  const endOfButtonCitationsData = useMemo(() => {
    if (!route) return { citations: [], evaluationResultId: undefined };

    const citationData = dosingFormState.perRouteState[route].citations.filter(
      (it) => it.location === CitationsLocationEnum.NEXT_TO_DOSE_OPTIONS,
    );

    const citations = citationData.map((it) => it.citation);

    // If there's only one unique evaluation result ID for all citations, use it for tracking
    // This ensures we only track with an evaluation result ID when all citations come from the same rule execution
    const uniqueEvaluationResultIds = new Set(
      citationData.map((it) => it.evaluationResultId),
    );
    const evaluationResultId =
      uniqueEvaluationResultIds.size === 1
        ? Array.from(uniqueEvaluationResultIds)[0]
        : undefined;

    return { citations, evaluationResultId };
  }, [dosingFormState, route]);

  const endOfButtonCitations = endOfButtonCitationsData.citations;

  useEffect(() => {
    setAvailableConcentrationOptions(medication.concentrationOptions);
    // default to setting the dose to the first one or one provided by mapping
    if (!isEmpty(medication.perComponentConcentrations)) {
      // set concentrations if we have one by default
      logger.debug(
        "Setting concentrations from per component concentrations: ",
        medication.perComponentConcentrations,
      );
      // @ts-ignore
      setConcentrations(medication.perComponentConcentrations);
    }

    if (medication.ndc) {
      logger.debug("Setting explicit ndc from scan: ", medication.ndc);
      setNDC(medication.ndc);
      setNdcMutable(false);
    } else if (medication.defaultNDC) {
      logger.debug(
        "Setting implicit ndc from selection: ",
        medication.defaultNDC,
        " options: ",
        medication.concentrationOptions,
      );
      const options = medication.concentrationOptions.filter(
        (option) => option.defaultNDC === medication.defaultNDC,
      );
      if (medication.concentrationOptions.length === 0) {
        logger.debug("No concentrations options so just use the default NDC");
        setNDC(medication.defaultNDC);
      } else if (options.length === 1) {
        logger.debug(
          "Setting concentration with matching default ndc: ",
          medication.defaultNDC,
          " concentration: ",
          options,
        );
        setConcentrations(options[0].concentrations);
      } else {
        logger.debug(
          "Unable to match concentrations based on default NDC: ",
          options,
        );
      }
    }

    setSelectionAlerts(dosingFormState.alerts);

    // set route after we set any dosing warnings since warnings can override dosing options
    // default route should be the 'first'
    const currentRoute = Object.keys(
      dosingFormState.perRouteState,
    )[0] as MedicationRoute;

    logger.debug("setting route to : ", currentRoute);
    setRoute(currentRoute);
  }, []);

  useEffect(() => {
    let fields: Record<any, any> = {
      route,
      doseAmount: validatedDoseAmount,
      doseUnits,
      adminHours: timeInput.state.hours,
      adminMinutes: timeInput.state.minutes,
      ndc,
    };
    if (availableConcentrationOptions.length > 0) {
      // add concentration options if there were concentration options to choose from
      fields.concentrations = concentrations;
    }
    const emptyFields = keys(
      pickBy(fields, (value) => isNil(value) || value === "" || isNaN(value)),
    );
    setShowErrors(false);
    setValidForm(emptyFields.length === 0 && fields.doseAmount > 0);
  }, [
    route,
    validatedDoseAmount,
    doseUnits,
    concentrations,
    availableConcentrationOptions.length,
    timeInput.state.minutes,
    timeInput.state.hours,
    ndc,
  ]);

  useEffect(() => {
    if (selectionAlerts?.length > 0 || dosingAlerts?.length > 0) {
      setHideForm(true);
    } else {
      setHideForm(false);
    }
    setSaveEnabled(true);
  }, [selectionAlerts, dosingAlerts]);

  useEffect(() => {
    if (isLoading && alertContainerRef && alertContainerRef.current) {
      setLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!route) {
      return;
    }
    const routeState = dosingFormState.perRouteState[route];
    const routeDoseUnit = routeState.doseUnits;
    if (routeDoseUnit) {
      setDoseUnits(routeDoseUnit.units);
    }

    // Use indication-specific dose options if an indication is selected, otherwise use route dose options
    const indicationDoseOptions = selectedIndication
      ? routeState.indicationDoseOptions[selectedIndication]
      : [];
    const routeDoseOptions = routeState.doseOptions;
    const doseOptions = selectedIndication
      ? indicationDoseOptions
      : routeDoseOptions;

    if (doseOptions) {
      setAvailableDoseOptions(doseOptions);
    }

    const defaultDoseAmount = getDefaultDoseAmount(doseOptions);
    if (defaultDoseAmount) {
      setDoseInputValue(defaultDoseAmount);
    }
  }, [route, selectedIndication, dosingFormState]);

  useEffect(() => {
    logger.debug(
      "selected concentrations option: ",
      concentrations,
      " available concentrations options: ",
      availableConcentrationOptions,
    );
    const options = availableConcentrationOptions.filter((option) =>
      isEqual(option.concentrations, concentrations),
    );
    logger.debug("matching options: ", options);
    if (options.length === 1) {
      if (ndcMutable || !ndc) {
        logger.debug(
          "Setting NDC based on concentration option",
          options[0].defaultNDC,
        );
        setNDC(options[0].defaultNDC);
      } else {
        logger.debug(
          "NDC is immutable",
          ndc,
          " didn't update to: : ",
          options[0].defaultNDC,
        );
      }
    } else {
      logger.debug("Unable to set NDC from concentration options: ", options);
    }
  }, [concentrations]);

  useEffect(() => {
    logger.debug("NDC updated: ", ndc);
  }, [ndc]);

  const handleDoseClick = (doseOption: DoseOption) => {
    if (doseOption.calculatedDoseAmount) {
      let n = parseFloat(doseOption.calculatedDoseAmount.replace(/,/g, ""));
      setDoseInputValue(n);
      setDoseUnits(doseOption.calculatedDoseUnits);
    }
  };

  const handleRouteClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    const routeValue = e.currentTarget.value;
    if ((routeValue as MedicationRoute) !== route) {
      setDoseInputValue("");
      setSelectedIndication(""); // Clear indication when route changes
    }
    if (routeValue) {
      setRoute(routeValue as MedicationRoute);
    }
  };

  const handleIndicationClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    const indicationValue = e.currentTarget.value;
    if (indicationValue === selectedIndication) {
      // Clicking selected indication deselects it
      setSelectedIndication("");
    } else {
      setSelectedIndication(indicationValue);
    }
    setDoseInputValue(""); // Clear dose when indication changes
  };

  const handleConcentrationClick = (concentrations: Concentration[]) => {
    setConcentrations(concentrations);
  };

  const handleSaveError = (error: APIError) => {
    console.error("Error saving: ", error);
    setSaveEnabled(true);
    setSaveAttemptFailed(true);
  };

  const handleSaveSuccess = () => {
    setSaveEnabled(true);
  };

  const handleFormSave = async () => {
    // reset attempt flag
    setSaveAttemptFailed(false);
    if (!validForm || !timeInput.state.isValid) {
      setShowErrors(true);
      return;
    }

    setSaveEnabled(false);
    const payload = generateFormPayload();
    const patientService = new PatientService();
    const response = await patientService.submitMedicationDose({
      patientId,
      caseId,
      clientId,
      payload,
    });
    logger.debug("medication dose check: ", response.extract());

    response.ifRight((data) => {
      if (data.alerts.length > 0) {
        // launch alert
        logger.debug("display alert: ", data);
        setDosingAlerts(data.alerts);
      } else {
        // launch save
        logger.debug("save medication based on no action needed: ", data);
        onDosingSave(payload, handleSaveSuccess, handleSaveError);
      }
    });
    response.ifLeft((error) => {
      logger.warn("Error submitting the medication dose for evaluation", error);
    });
  };

  const handleFormCancel = () => {
    onDosingCancel({
      tabKey: tabKey,
      resolution: RestoreTabResolutionEnum.USER_CANCELLED,
    });
  };

  const generateFormPayload = (): DosingFormPayload => {
    return {
      tabKey: tabKey,
      doseAmount: validatedDoseAmount,
      doseUnits: doseUnits,
      concentrations: concentrations,
      route: route,
      selectedIndication: selectedIndication || undefined,
      adminMonth: timeInput.state.month,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      adminDay: timeInput.state.day,
      adminYear: timeInput.state.year,
      adminHours: timeInput.state.hours,
      adminMinutes: timeInput.state.minutes,
      medicationIdentifier: medication.medicationIdentifier,
      medicationName: medication.medicationName,
      ndc: ndc,
      userId: userId,
      trackingTabId: trackingTabId,
    };
  };

  const medicationLabelStyle = getMedicationLabelStyle(
    medication.colorLabelSetting,
    false,
  );

  const acceptSelectionAlert = (alert: AlertDefinition) => {
    logger.debug("Selection form alert accepted: ", alert);

    setSelectionAlerts([]);
    onDosingCancel({
      tabKey: tabKey,
      resolution: RestoreTabResolutionEnum.GUIDANCE_CANCELLED,
    });

    Promise.resolve(
      ruleExecutionResultService.submitResponse({
        patientId,
        clientId,
        resultId: alert.resultId,
        accepted: true,
        trackingTabId: trackingTabId,
      }),
    )
      .then((response) => {
        logger.debug("accept response: ", response);
        // clear out the alerts when they accept
      })
      .catch((error) => {
        logger.debug("promise error: ", error);
      });
  };

  const rejectSelectionAlert = async ({
    alert,
    rejectionOption,
    reason,
    reasonComment,
    suppressFutureAlertsOfThisType,
    suppressFutureAlertsForThisAllergy,
    markMedicationAsTolerated,
    rejectionReasonCustomInput,
  }: RejectAlertPayload): Promise<RejectAlertResponse> => {
    logger.debug("Selection form alert rejected: ", alert);

    // clear out the alerts when they accept
    const updateDosingAlerts = selectionAlerts.filter(
      (dosingAlert) => dosingAlert.resultId !== alert.resultId,
    );
    setSelectionAlerts(updateDosingAlerts);

    const response = await ruleExecutionResultService.submitResponse({
      patientId,
      clientId,
      resultId: alert.resultId,
      accepted: false,
      suppressFutureAlertsOfThisType,
      suppressFutureAlertsForThisAllergy,
      markMedicationAsTolerated,
      rejectionOption,
      reason,
      reasonComment,
      rejectionReasonCustomInput,
    });

    if (suppressFutureAlertsOfThisType) {
      await ruleSettings.fetchRuleSettings();
    }

    logger.debug("submit alert response: ", response.extract());
    if (response.isRight()) {
      return {};
    }
    return response.caseOf(submitRuleResponseErrorToRejectAlertResponse);
  };

  const acceptDosingAlert = (alert: AlertDefinition) => {
    logger.debug("Dosing form alert accepted: ", alert);

    // clear out the alerts when they accept
    setDosingAlerts([]);

    Promise.resolve(
      ruleExecutionResultService.submitResponse({
        patientId,
        clientId,
        resultId: alert.resultId,
        accepted: true,
      }),
    )
      .then((response) => {
        logger.debug("accept response: ", response);
      })
      .catch((error) => {
        console.error("promise error: ", error);
      });
  };

  const rejectDosingAlert = async ({
    alert,
    rejectionOption,
    reason,
    reasonComment,
    suppressFutureAlertsOfThisType,
    suppressFutureAlertsForThisAllergy,
    markMedicationAsTolerated,
    rejectionReasonCustomInput,
  }: RejectAlertPayload): Promise<RejectAlertResponse> => {
    logger.debug("Dosing form alert rejected: ", alert);

    const updateDosingAlerts = dosingAlerts.filter(
      (dosingAlert) => dosingAlert.resultId !== alert.resultId,
    );
    setDosingAlerts(updateDosingAlerts);

    const response = await ruleExecutionResultService.submitResponse({
      patientId,
      clientId,
      resultId: alert.resultId,
      accepted: false,
      suppressFutureAlertsOfThisType,
      suppressFutureAlertsForThisAllergy,
      markMedicationAsTolerated,
      rejectionOption,
      reason,
      reasonComment,
      rejectionReasonCustomInput,
    });

    if (suppressFutureAlertsOfThisType) {
      await ruleSettings.fetchRuleSettings();
    }

    logger.debug("submit alert response: ", response.extract());
    if (response.isRight()) {
      // clear out the alerts when they accept
      if (updateDosingAlerts.length == 0) {
        const params = generateFormPayload();
        onDosingSave(params, handleSaveSuccess, handleSaveError);
      }
    }
    return response.caseOf(submitRuleResponseErrorToRejectAlertResponse);
  };

  function hasWeightBasedDose(availableDoseOptions: DoseOption[]) {
    return availableDoseOptions.some(isWeightBasedDoseOption);
  }

  useEffect(() => {
    setCanCloseTab(!selectionAlerts?.length && !dosingAlerts?.length);
  }, [selectionAlerts?.length, dosingAlerts?.length]);

  const scannedAndConcentrationsDetermined =
    medication.isScanned && !isEmpty(medication.perComponentConcentrations);
  const shouldShowConcentrationOptions =
    availableConcentrationOptions.length > 0 &&
    !scannedAndConcentrationsDetermined;

  return (
    <MedicationSelectionContextProvider medication={medication}>
      <div ref={alertContainerRef} className="DosingForm">
        {selectionAlerts?.length > 0 && (
          <GuidanceAlert
            title="Medication Selection Alert"
            alerts={selectionAlerts}
            acceptAlert={acceptSelectionAlert}
            rejectAlert={rejectSelectionAlert}
          />
        )}
        {dosingAlerts?.length > 0 && (
          <GuidanceAlert
            title="Medication Dosing Alert"
            alerts={dosingAlerts}
            acceptAlert={acceptDosingAlert}
            rejectAlert={rejectDosingAlert}
            playAlertSound={true}
          />
        )}

        <div
          className={`border dose-display ${hideForm ? "visually-hidden" : ""}`}
        >
          <div className="medication-label" style={medicationLabelStyle}></div>
          <div className="medication-form mt-2">
            <OverlayTrigger
              placement="right"
              overlay={<Tooltip>NDC: {ndc}</Tooltip>}
              trigger={userIsAdmin ? ["hover", "focus"] : []}
            >
              <span className="h2">{medication.medicationName}</span>
            </OverlayTrigger>
            {saveAttemptFailed && (
              <div style={{ width: "fit-content" }} className="mt-2">
                <Alert key="danger" variant="danger">
                  Documentation error. Please document medication directly in
                  Epic.
                </Alert>
              </div>
            )}
            <Form>
              {route && (
                <div className="row">
                  <DosingFormBanners
                    infos={dosingFormState.perRouteState[route].infos}
                    warnings={dosingFormState.perRouteState[route].warnings}
                  />
                </div>
              )}

              <div className="row">
                <Form.Group
                  className="mb-1 pt-1 pb-1 form-section"
                  controlId="route"
                >
                  <label className="fw-bold me-3">Route</label>
                  {Object.keys(dosingFormState.perRouteState).map(
                    (routeOption) => {
                      return (
                        <Button
                          key={routeOption}
                          variant={
                            route === routeOption
                              ? "secondary"
                              : "outline-secondary"
                          }
                          className="me-3 text-capitalize form-option"
                          onClick={handleRouteClick}
                          value={routeOption}
                        >
                          {routeOption.toLowerCase().replaceAll("_", " ")}
                        </Button>
                      );
                    },
                  )}
                </Form.Group>
                {route &&
                  dosingFormState.perRouteState[route].indicationDoseOptions &&
                  Object.keys(
                    dosingFormState.perRouteState[route].indicationDoseOptions,
                  ).length > 0 && (
                    <Form.Group
                      className="mb-1 pt-1 pb-1 form-section"
                      controlId="indication"
                    >
                      <label className="fw-bold me-3">Indication</label>
                      {Object.keys(
                        dosingFormState.perRouteState[route]
                          .indicationDoseOptions,
                      ).map((indicationOption) => {
                        return (
                          <Button
                            key={indicationOption}
                            variant={
                              selectedIndication === indicationOption
                                ? "secondary"
                                : "outline-secondary"
                            }
                            className="me-3 form-option"
                            onClick={handleIndicationClick}
                            value={indicationOption}
                          >
                            {indicationOption}
                          </Button>
                        );
                      })}
                    </Form.Group>
                  )}
                <Form.Group
                  className={`mb-1  pb-1 d-flex flex-row form-section ${
                    doseIsInvalid ? "invalid" : ""
                  }`}
                >
                  <DoseInput
                    doseInputValue={doseInputValue}
                    onDoseChange={setDoseInputValue}
                    doseUnits={doseUnits}
                    showInvalid={doseIsInvalid}
                    patientWeightKg={patientWeightKg}
                    showWeightBasedDose={isPediatricPatient}
                  />
                  <div
                    data-testid="dose-button-container"
                    className={
                      "ms-3 dose-button-container " +
                      (hasWeightBasedDose(availableDoseOptions)
                        ? "has-weight-based-dose"
                        : "")
                    }
                  >
                    {availableDoseOptions.map((doseOption) => (
                      <DoseButton
                        key={doseOption.calculatedLabel}
                        dose={doseOption}
                        onClick={() => handleDoseClick(doseOption)}
                        selected={
                          doseInputValue ==
                            doseOption.calculatedDoseAmount.replace(/,/g, "") &&
                          doseUnits === doseOption.calculatedDoseUnits
                        }
                        className={"me-3 mt-1 form-option"}
                      />
                    ))}
                  </div>
                  {endOfButtonCitations && (
                    <div className="d-inline-block align-self-start pt-1">
                      <RuleCitationContainer
                        iconSize={14}
                        citations={endOfButtonCitations}
                        evaluationResultId={
                          endOfButtonCitationsData.evaluationResultId
                        }
                      />
                    </div>
                  )}
                </Form.Group>
                {shouldShowConcentrationOptions && (
                  <Form.Group
                    className={`mb-1 pt-1 pb-1 form-section ${
                      showErrors &&
                      (!concentrations || concentrations.length == 0)
                        ? "invalid"
                        : ""
                    }`}
                    controlId="concentration"
                  >
                    <label className="fw-bold pe-4">Concentration</label>
                    {availableConcentrationOptions.map(
                      (concentrationOption) => (
                        <ConcentrationButton
                          key={concentrationOption.label}
                          option={concentrationOption}
                          selected={isEqual(
                            concentrations,
                            concentrationOption.concentrations,
                          )}
                          onClick={() => {
                            handleConcentrationClick(
                              concentrationOption.concentrations,
                            );
                          }}
                        />
                      ),
                    )}
                  </Form.Group>
                )}
                <Form.Group
                  className={`mb-1 pt-1 pb-1 form-section ${
                    showErrors && !timeInput.state.isValid ? "invalid" : ""
                  }`}
                  controlId="administration-time"
                >
                  <div className="d-flex">
                    <label className="fw-bold pe-4">Time</label>
                    {/* TODO: handle display a date picker if we have lapsed midnight since the dosing form could have displayed for one day but we have crossed midnight */}
                    <div>
                      <TimeInput
                        timeHook={timeInput}
                        inductionTime={inductionTime}
                        usePresetDropdown={useNewTimePicker}
                      />
                      <div>
                        {timeInput.state.timeValuesAreValid &&
                        !timeInput.state.timeRangeIsValid ? (
                          <div className="guided-maroon">
                            &ge; 1 hr ago, must document med directly in EHR
                          </div>
                        ) : timeInput.state.timeValuesAreValid &&
                          timeInput.state.timeIsInTheFuture ? (
                          <div className="guided-maroon">
                            Time must be on or before current time:{" "}
                            <CurrentTime />
                          </div>
                        ) : !timeInput.state.isValid ? (
                          <div className="guided-maroon">Invalid value</div>
                        ) : undefined}
                        {overlappingAdministration && (
                          <CumulativeDoseWarning
                            overlappingAdministration={
                              overlappingAdministration
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </Form.Group>
              </div>
              <div className="row">
                <div className="offset-5 col-7 py-3">
                  <Button
                    variant="primary"
                    onClick={handleFormSave}
                    disabled={!saveEnabled}
                  >
                    Save
                  </Button>
                  <Button
                    variant="link"
                    className="ms-3"
                    onClick={handleFormCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </MedicationSelectionContextProvider>
  );
};

export default DosingForm;

function CurrentTime() {
  const now = useNow();
  return (
    <>
      {padStart(now.getHours().toString(), 2, "0")}:
      {padStart(now.getMinutes().toString(), 2, "0")}
    </>
  );
}

function CumulativeDoseWarning(props: {
  overlappingAdministration: OverlappingAdministrationsResponseDto;
}) {
  const administrationDate = new Date(
    props.overlappingAdministration.administrationDate,
  );
  const time = `${padStart(
    administrationDate.getHours().toString(),
    2,
    "0",
  )}:${padStart(administrationDate.getMinutes().toString(), 2, "0")}`;
  const dose = props.overlappingAdministration.dose;

  return (
    <div className="guided-maroon">
      Enter cumulative dose.
      <br />
      This will override {dose} documented at {time}.
    </div>
  );
}
