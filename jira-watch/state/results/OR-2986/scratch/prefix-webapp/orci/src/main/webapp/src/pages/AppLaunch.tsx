import "./AppLaunch.scss";

import * as Sentry from "@sentry/react";
import { logger } from "../utils/logger";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Col, Container, Row, Tab, Tabs } from "react-bootstrap";
import { X } from "react-bootstrap-icons";
import PatientBanner from "../components/PatientBanner";
import GuidanceAlert from "../components/GuidanceAlert";
import GuidanceSocket from "../components/GuidanceSocket";
import Footer from "../components/Footer";
import { FavoritesSidebar } from "../components/FavoritesSidebar/FavoritesSidebar";
import Home from "../components/Home";

import DosingForm from "../components/DosingForm";
import BarcodeInput from "../components/BarcodeInput";
import VitalSignRulesOptInPrompt from "../components/VitalSignRulesOptInPrompt";

import RuleExecutionResultService, {
  submitRuleResponseErrorToRejectAlertResponse,
} from "../services/RuleExecutionResultService";

import InAppDebugger from "../components/Debug/InAppDebugger";
import { InAppAdminPanel } from "../components/Admin/InAppAdminPanel";
import { useAppQueryParams, useRuleSettings } from "../hooks/hooks";
import { useElementWidth } from "../hooks/useElementWidth";
import { DateTime, Duration } from "luxon";
import { IconSpec, TabIcon } from "../components/TabIcon";
import { TabData } from "../types/TabData";
import { GuidanceNotificationPayload } from "../types/GuidanceNotification";
import { MedicationSelectionCheckResponse } from "../types/MedicationSelectionCheckResponse";
import { OperationStatus, OperationStatusEnum } from "../types/OperationStatus";
import {
  ApplicationLaunchContext,
  LaunchBlockedDTO,
} from "../types/ApplicationLaunchContext";
import {
  RejectAlertPayload,
  RejectAlertResponse,
} from "../components/Alert/AlertBody";
import { TabType } from "../types/TabType";
import PatientService from "../services/PatientService";
import { DosingFormPayload } from "../types/DosingFormPayload";
import { APIError, APIUnknownError } from "../errors/APIError";
import { useDebouncedCallback } from "use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import { getMedicationsOptions } from "@api/@tanstack/react-query.gen";
import { LoginResult, useAuth } from "../context/AuthContext";
import {
  playAlertAudio,
  preloadCommonMedicationAudioAnnouncements,
} from "../utils/dosingForm/playAlertAudio";
import { FeatureKeyEnum, useFeatureFlag } from "../hooks/useFeatureFlag";
import { parseBarcode } from "../utils/barcodes";
import { isAlert } from "../utils/predicates";
import {
  AppLaunchController,
  AppLaunchRuleController,
  MedicationMacroItemDto,
  MedicationSelectionRuleController,
} from "@api";
import {
  createRestoreMedsFromCurrentUserTab,
  createRestoreMedsFromOtherUsersTab,
  createTab,
  TabNames,
  useGuidanceTabs,
} from "../hooks/useGuidanceTabs";
import { TabID } from "../types/identifiers";
import {
  closeWindow,
  DISABLE_CLOSE_DIALOG,
  disableCloseDialog,
  focusWindow,
  minimizeWindow,
} from "../utils/windowControl";
import UserTabStateService from "../services/UserTabStateService";
import RestoreMedsPrompt from "../components/RestoreMedsPrompt";
import {
  RestoreTabResolution,
  RestoreTabResolutionEnum,
} from "../types/RestoreTabResolution";
import { RestorePromptTypeEnum } from "../types/RestorePromptType";
import { AlertDefinition } from "../types/AlertDefinition";
import { toHandRolledAlert } from "../types/typeConversions";
import { AppLaunchLoadingDisplay } from "../components/AppLaunchLoadingDisplay";
import { LaunchBlockedDisplay } from "../components/LaunchBlockedDisplay";
import { LaunchErrorDisplay } from "../components/LaunchErrorDisplay";
import { isArray, isError } from "lodash";
import { OperationHeartbeat } from "../components/OperationHeartbeat";
import { ScanMedsReminderBanner } from "../components/ScanMedsReminderBanner";
import { FeatureFlagNoteViewer } from "../components/FeatureFlagNoteViewer";
import { HelpTooltip } from "../components/HelpTooltip";
import { FeedbackWidget } from "../components/Feedback/FeedbackWidget";
import { EventType } from "../services/TrackingEventService";
import { useTrackingEvent } from "../hooks/useTrackingEvent";

const ruleExecutionResultService = new RuleExecutionResultService();

const AppLaunch = () => {
  const queryParams = useAppQueryParams();
  const [context, setContext] = useState<ApplicationLaunchContext>();
  const [launchBlockedReason, setLaunchBlockedReason] =
    useState<LaunchBlockedDTO | null>();
  const [loading, setLoading] = useState(true);
  const [appLaunchKey, setAppLaunchKey] = useState<string>();
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [medicationScanError, setMedicationScanError] = useState("");

  const barcodeInput = useRef();
  const barcodeValue = useRef("");
  const [clearMedicationScanErrorTimeout, setClearMedicationScanErrorTimeout] =
    useState<any>(null);
  const [pendingUnknownBarcode, setPendingUnknownBarcode] = useState<
    string | null
  >(null);
  const pendingUnknownBarcodeRef = useRef<string | null>(null);

  const updatePendingBarcode = (barcode: string | null) => {
    pendingUnknownBarcodeRef.current = barcode;
    setPendingUnknownBarcode(barcode);
  };
  const auth = useAuth();
  const queryClient = useQueryClient();

  const [launchError, setLaunchError] = useState<{
    e: Error;
    display: string;
  }>();
  const [showSettings, setShowSettings] = useState(false);
  const guidanceTabs = useGuidanceTabs();
  const [appLaunchAlerts, setAppLaunchAlerts] = useState<AlertDefinition[]>([]);
  const { trackingService: trackingEventService, recordEvent } =
    useTrackingEvent(queryParams.patientId, queryParams.caseId);

  const [notifyOnVitalSignAlerts, setNotifyOnVitalSignAlerts] = useState(true);
  const [operationStatus, setOperationStatus] = useState<OperationStatus>(
    OperationStatusEnum.IN_PROGRESS,
  );
  const [showMedicationScanReminder, setShowMedicationScanReminder] =
    useState(false);

  const isOperationCompleted = useMemo(
    () => operationStatus === OperationStatusEnum.COMPLETED,
    [operationStatus],
  );

  const isOperationEnding = useMemo(
    () => operationStatus === OperationStatusEnum.ENDING,
    [operationStatus],
  );
  const [operationStatusTimestamp, setOperationStatusTimestamp] =
    useState<Date>(new Date());

  const [showIncompleteDosingWindows, setShowIncompleteDosingWindowsWarning] =
    useState(false);

  const ruleSettings = useRuleSettings();
  const userTabStateService = useMemo(() => new UserTabStateService(), []);
  const patientService = useMemo(() => new PatientService(), []);
  const inductionTime = useMemo(
    () =>
      context?.operation.inductionStartTime
        ? new Date(context.operation.inductionStartTime)
        : null,
    [context?.operation.inductionStartTime],
  );
  const homescreenHelpTooltipEnabled = useFeatureFlag(
    FeatureKeyEnum.HELP_TOOLTIP_HOMESCREEN,
  );
  const medicationFavoritesEnabled = useFeatureFlag(
    FeatureKeyEnum.MEDICATION_FAVORITES,
  );

  const showStaleDosingFormBanner = guidanceTabs.findStale().length > 0;

  const [showFeedbackWidget, setShowFeedbackWidget] = useState(false);

  const [sidebarRef, sidebarWidth] = useElementWidth(
    homescreenHelpTooltipEnabled && medicationFavoritesEnabled,
  );

  useEffect(() => {
    if (authenticated) {
      queryClient.prefetchQuery(getMedicationsOptions());
    }
  }, [authenticated, queryClient]);

  useEffect(() => {
    preloadCommonMedicationAudioAnnouncements();
  }, []);

  // Cleanup medication scan error timeout on unmount
  useEffect(() => {
    return () => {
      if (clearMedicationScanErrorTimeout) {
        clearTimeout(clearMedicationScanErrorTimeout);
      }
    };
  }, [clearMedicationScanErrorTimeout]);

  useEffect(() => {
    const onBeforeUnload = (e: any) => {
      logger.debug(
        "onBeforeUnload fired, is programmatic:",
        DISABLE_CLOSE_DIALOG,
      );
      if (DISABLE_CLOSE_DIALOG) {
        return undefined;
      }
      e.preventDefault();
      e.returnValue = true;
      // some browsers ignore this string and show a generic message
      return "Are you sure you want to close the page?";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  const handleWindowFocus = useCallback(() => {
    if (!context) {
      // Only track focus/blur events if we have an operation context
      return;
    }
    if (!document.hasFocus()) {
      // Prevent handling if focus is internal to the app
      return;
    }
    recordEvent(EventType.WINDOW_FOCUS_CHANGE, {
      focusState: "FOCUS",
    });
  }, [context, recordEvent]);

  const handleWindowBlur = useCallback(() => {
    if (!context) {
      // Only track focus/blur events if we have an operation context
      return;
    }
    if (document.hasFocus()) {
      return;
    }
    recordEvent(EventType.WINDOW_FOCUS_CHANGE, {
      focusState: "BLUR",
    });
  }, [context, recordEvent]);

  useEffect(() => {
    // Attach event listeners to the window
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);

    // Cleanup: Remove event listeners on unmount
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [handleWindowFocus, handleWindowBlur]);

  const addMedication = (
    medicationSelection: MedicationSelectionCheckResponse,
    options?: { skipAudio?: boolean; skipTabSelect?: boolean },
  ) => {
    logger.debug("med selection: ", medicationSelection);
    logger.debug("tabs: ", guidanceTabs.getTabs());

    const pendingBarcode = pendingUnknownBarcodeRef.current;
    if (pendingBarcode && medicationSelection?.context) {
      updatePendingBarcode(null);
      setMedicationScanError("");
      MedicationSelectionRuleController.saveUserBarcodeMapping({
        path: {
          patientId: queryParams.patientId,
          caseId: queryParams.caseId,
        },
        body: {
          barcode: pendingBarcode,
          medicationIdentifier:
            medicationSelection.context.medicationIdentifier,
        },
      }).catch((e) => console.error("Failed to save user barcode mapping", e));
    }

    if (medicationSelection?.context) {
      const medication = medicationSelection.context;
      const createTime = DateTime.now();
      const tabPrefix = "admin-med-" + medication.id;
      const tabName = tabPrefix + "-" + medicationSelection.trackingTabId;

      const newTab: TabData = createTab(tabName, {
        type: TabType.MEDICATION_DOSING_FORM,
        title: medication.medicationName,
        medication: medication,
        created: createTime,
        dosingFormState: medicationSelection.dosingFormState,
        isStale: false,
        ndc: medicationSelection.context.ndc,
        trackingTabId: medicationSelection.trackingTabId,
      });

      const recentMedicationTab = guidanceTabs.getRecentTab(
        tabPrefix,
        createTime,
      );
      const tabExists =
        recentMedicationTab != undefined && !medicationSelection.restoredTab;
      let audioPromise: Promise<void> = Promise.resolve();
      if (
        !medicationSelection.restoredTab &&
        !tabExists &&
        !options?.skipAudio
      ) {
        audioPromise = playAlertAudio(
          medicationSelection.results,
          medication,
          true,
        );
      }

      setShowMedicationScanReminder(false); // hide the medication scan reminder when a med is selected

      const select = !options?.skipTabSelect;
      if (!tabExists) {
        guidanceTabs.addTab(newTab, {
          select,
          staleDuration: Duration.fromObject({ minutes: 20 }),
        });
      } else if (select) {
        logger.debug("Tab already exists: ", newTab);
        guidanceTabs.selectTab(recentMedicationTab.name);
      }
      return audioPromise;
    }
    return Promise.resolve();
  };

  // Track event when "Complete open medication tabs" banner is shown (stale dosing forms)
  useEffect(() => {
    if (showStaleDosingFormBanner) {
      recordEvent(EventType.COMPLETE_MEDICATION_TABS_BANNER_SHOWN, {
        staleTabs: guidanceTabs.findStale().length,
        numTabs: guidanceTabs.getTabs().length,
      });
    }
  }, [showStaleDosingFormBanner, recordEvent]);

  useEffect(() => {
    if (showStaleDosingFormBanner) {
      focusWindow(trackingEventService);
    }
  }, [showStaleDosingFormBanner]);

  const addAppLaunchAlerts = (alerts: AlertDefinition[]) => {
    logger.debug("alerts: ", alerts);
    // double it
    // setAppLaunchAlerts(alerts.flatMap(a=>[a,a]));
    setAppLaunchAlerts(alerts);
    if (alerts.length > 0) {
      const newTab: TabData = createTab(TabNames.APP_LAUNCH_RULE_TAB, {
        title: "Pre-Op Alerts",
        type: TabType.PREOP_ALERTS,
        created: DateTime.now(),
      });

      guidanceTabs.addTab(newTab, { select: true });
    }
  };

  const promptForVitalSignAlertsOptIn = () => {
    const newTab: TabData = createTab(TabNames.VITAL_SIGNS_OPT_IN_TAB, {
      title: "Vital Signs Opt-In",
      type: TabType.VITAL_SIGN_OPT_IN,
      created: DateTime.now(),
    });

    guidanceTabs.addTab(newTab, { select: true });
  };

  const handleInvalidMedication = (
    error: APIUnknownError,
    barcode?: string,
  ) => {
    let errorMessage = "";
    if (error.status === 404) {
      errorMessage = "Barcode not found. Select medication from dropdown.";
      clearTimeout(clearMedicationScanErrorTimeout);
      setMedicationScanError(errorMessage);
      updatePendingBarcode(barcode ?? null);
      // No auto-dismiss timeout for 404 — banner is persistent until dismissed or resolved
    } else if (error.status == 406) {
      errorMessage = error.data.message;
      updatePendingBarcode(null);
      if (errorMessage) {
        clearTimeout(clearMedicationScanErrorTimeout);
        setMedicationScanError(errorMessage);
        const errorTimeout = setTimeout(() => {
          setMedicationScanError("");
        }, 10 * 1000);
        setClearMedicationScanErrorTimeout(errorTimeout);
      }
    }
    guidanceTabs.selectTab(TabNames.HOME_TAB);
  };

  const selectMedicationFromFavorites = async (
    medicationIdentifier: string,
    options?: { skipAudio?: boolean },
  ): Promise<void> => {
    const response = await patientService.evaluateMedication({
      patientId: queryParams.patientId,
      caseId: queryParams.caseId,
      clientId: queryParams.tenantId,
      medicationIdentifier,
    });
    let audioPromise: Promise<void> = Promise.resolve();
    response.caseOf({
      Left: (error) => {
        if (error instanceof APIUnknownError) {
          handleInvalidMedication(error);
        }
      },
      Right: (data) => {
        if (data) audioPromise = addMedication(data, options);
      },
    });
    return audioPromise;
  };

  const selectMacroMedications = async (
    items: MedicationMacroItemDto[],
  ): Promise<void> => {
    // Fire all evaluations in parallel
    const responses = await Promise.all(
      items.map((item) =>
        patientService
          .evaluateMedication({
            patientId: queryParams.patientId,
            caseId: queryParams.caseId,
            clientId: queryParams.tenantId,
            medicationIdentifier: item.medicationIdentifier,
          })
          .catch((e) => {
            console.error("Failed to evaluate medication in macro", e);
            return undefined;
          }),
      ),
    );

    // Build all tabs and figure out which one to select
    const newTabs: TabData[] = [];
    let firstAlertTabName: TabID | undefined;
    let lastTabName: TabID | undefined;
    const audioQueue: Array<() => Promise<void>> = [];

    for (const response of responses) {
      if (!response) continue;
      response.ifRight((data) => {
        if (!data?.context) return;

        const medication = data.context;
        const tabName = ("admin-med-" +
          medication.id +
          "-" +
          data.trackingTabId) as TabID;

        newTabs.push(
          createTab(tabName, {
            type: TabType.MEDICATION_DOSING_FORM,
            title: medication.medicationName,
            medication,
            created: DateTime.now(),
            dosingFormState: data.dosingFormState,
            isStale: false,
            ndc: data.context.ndc,
            trackingTabId: data.trackingTabId,
          }),
        );

        lastTabName = tabName;
        if (!firstAlertTabName && data.results.some((r) => isAlert(r))) {
          firstAlertTabName = tabName;
        }

        audioQueue.push(() => playAlertAudio(data.results, data.context, true));
      });
    }

    if (newTabs.length > 0) {
      setShowMedicationScanReminder(false);
      // Single dispatch: add all tabs at once with the correct one selected
      guidanceTabs.addTabs(newTabs, {
        selectedTabName: firstAlertTabName ?? lastTabName,
        staleDuration: Duration.fromObject({ minutes: 20 }),
      });
    }

    // Play audio sequentially so announcements don't overlap
    for (const play of audioQueue) {
      await play();
    }
  };

  const submitBarcode = useDebouncedCallback(
    async (barcode) => {
      const barcodeInputUsed = document.activeElement === barcodeInput.current;
      if (!barcodeInputUsed) {
        if (barcode?.length >= 5) {
          updatePendingBarcode(null);
          setMedicationScanError("");
          clearTimeout(clearMedicationScanErrorTimeout);

          const parsedBarcode = parseBarcode(barcode);

          const response = await patientService.evaluateMedication({
            patientId: queryParams.patientId,
            caseId: queryParams.caseId,
            clientId: queryParams.tenantId,
            barcodeValue: parsedBarcode,
          });
          response.caseOf({
            Left: (error) => {
              console.error(
                "Error getting medication selection response for ndc: ",
                barcode,
                " error: ",
                error,
              );
              if (error instanceof APIUnknownError) {
                handleInvalidMedication(error, barcode);
              }
            },
            Right: (data) => {
              if (!data) {
                logger.debug(
                  "No data in medication selection response for " +
                    parsedBarcode,
                  response,
                );
              } else {
                logger.debug("Sending medication selection response: ", data);
                addMedication(data);
              }
            },
          });
        } else {
          logger.debug("suppressed key logger - not long enough - " + barcode);
        }
      } else if (barcodeInputUsed) {
        logger.debug("suppressed key logger - input form used - " + barcode);
      }
      // reset input
      barcodeValue.current = "";
    },
    100,
    { trailing: true, leading: false },
  );

  const barcodeScanner = (key: string) => {
    barcodeValue.current = barcodeValue.current + key;
    submitBarcode(barcodeValue.current);
  };

  const keypressListener = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      return;
    }
    barcodeScanner(e.key);
  };

  const registerBarcodeScanListeners = () => {
    window.addEventListener("keypress", keypressListener);
  };

  const registerWindowEventListeners = () => {
    registerBarcodeScanListeners();
  };

  const deregisterWindowEventListeners = () => {
    deregisterBarcodeScanListeners();
  };

  const deregisterBarcodeScanListeners = () => {
    logger.debug("deregistering barcode input listeners");
    window.removeEventListener("keypress", keypressListener);
  };

  const dosingFormSave = async (
    dosingForm: DosingFormPayload,
    onSuccess: Function,
    onFailure: (e: APIError) => void,
  ) => {
    logger.debug("Dosing save: ", dosingForm);

    const response = await patientService.saveMedicationAdministration({
      patientId: queryParams.patientId,
      caseId: queryParams.caseId,
      clientId: queryParams.tenantId,
      dosingForm,
    });
    response.ifRight(() => {
      onSuccess();
      guidanceTabs.removeTab(dosingForm.tabKey);
    });
    response.ifLeft((error) => {
      onFailure(error);
    });
  };

  const dosingFormCancel = (dosingForm: {
    tabKey: TabID;
    resolution: RestoreTabResolution;
  }) => {
    logger.debug("Dosing cancel: ", dosingForm);
    const tab = guidanceTabs.getTab(dosingForm.tabKey);
    guidanceTabs.removeTab(dosingForm.tabKey);
    if (tab && tab.trackingTabId) {
      userTabStateService.trackCancel(
        queryParams.userId,
        queryParams.tenantId,
        dosingForm.resolution,
        tab.trackingTabId,
      );
    }
  };

  const onGuidanceNotification = (
    notification: GuidanceNotificationPayload,
  ) => {
    logger.debug("Notification: ", notification);
    if (queryParams.patientId !== notification?.patient?.pmrn) {
      logger.error("PATIENT MISMATCH: ", {
        queryPatientId: queryParams.patientId,
        notificationPmrn: notification?.patient?.pmrn,
      });
      return;
    }

    const notificationAlerts: AlertDefinition[] = !notifyOnVitalSignAlerts
      ? notification?.alerts.filter(
          (alert) => alert.ruleTrigger !== "CONTINUOUS",
        )
      : notification.alerts.slice();

    if (notificationAlerts?.length > 0) {
      if (notification.notifyPerRule) {
        notificationAlerts.forEach((notificationAlert) => {
          logger.debug("notificationAlert:", notificationAlert);
          const newTab: TabData = createTab(
            `notification-alert-${notificationAlert.resultId}`,
            {
              type: TabType.NOTIFICATION_ALERT,
              title: notificationAlert.tabName!,
              guidance: [notificationAlert],
              created: DateTime.now(),
              playAlertSound: true,
            },
          );
          guidanceTabs.addTab(newTab, { select: true });
        });
      } else {
        const newTab: TabData = createTab(
          `notification-alert-${notification.id}`,
          {
            type: TabType.NOTIFICATION_ALERT,
            title: notification.tabName!,
            guidance: notificationAlerts,
            created: DateTime.now(),
            playAlertSound: true,
          },
        );
        guidanceTabs.addTab(newTab, { select: true });
      }

      // focus the window
      focusWindow(trackingEventService);
    }
  };

  const onOperationCompleted = () => {
    setOperationStatus(OperationStatusEnum.COMPLETED);
    setOperationStatusTimestamp(new Date());
  };

  const onOperationEnding = () => {
    disableCloseDialog();
    setOperationStatus(OperationStatusEnum.ENDING);
    setOperationStatusTimestamp(new Date());
  };

  const onOperationUpdated = (data: GuidanceNotificationPayload) => {
    setContext((prev) =>
      prev ? { ...prev, operation: data.operation } : prev,
    );
  };

  useEffect(() => {
    if (guidanceTabs.getSelectedTab() === undefined) {
      // if the selected tab was deleted...
      let tabs = guidanceTabs.getTabs();
      const updatedSelectedTab = tabs[tabs.length - 1].name;
      logger.debug(
        "previously selected tab is gone, selecting next available tab:",
        updatedSelectedTab,
      );
      guidanceTabs.selectTab(updatedSelectedTab);
    }
    // if there are no open tabs, minimize the window
    if (!guidanceTabs.hasOpenTabs() && !loading) {
      minimizeWindow(trackingEventService);
    }
  }, [guidanceTabs.getTabs()]);

  function promptToRestoreTabs(tabData: TabData) {
    const newTab: TabData = createTab(tabData.name, tabData);

    guidanceTabs.addTab(newTab, { select: true });
  }

  const handleLocalLaunch = () => {
    if (
      window.location.host.startsWith("localhost") &&
      queryParams.tenantId === null
    ) {
      window.location.href =
        "http://localhost:8080" +
        window.location.pathname +
        window.location.search;
    }
  };

  useEffect(() => {
    const initiateApp = async () => {
      await Sentry.startSpan(
        { name: "app-launch", op: "app.launch" },
        async () => {
          logger.debug("Initializing app... ", queryParams.tenantId);
          handleLocalLaunch();
          try {
            await Sentry.startSpan(
              { name: "getCsrfToken", op: "app.launch.auth" },
              () => auth.getCsrfToken(),
            );
          } catch (e) {
            setLoading(false);
            if (isError(e)) {
              setLaunchError({
                e,
                display: "Unable to authenticate request.",
              });
            }
            return;
          }

          let loginResult: LoginResult;
          try {
            loginResult = await Sentry.startSpan(
              { name: "login", op: "app.launch.auth" },
              () => auth.login(queryParams.tenantId, queryParams.userId),
            );
          } catch (e) {
            setLoading(false);
            if (isError(e))
              setLaunchError({ e, display: "Unable to authenticate user." });
            return;
          }

          if (loginResult.type === "loggedIn") {
            Sentry.setUser({
              username: loginResult.userDetails.username,
            });
            Sentry.setTag("tenant", queryParams.tenantId);

            setAuthenticated(true);
            setIsAdmin(
              (loginResult.userDetails.roles ?? []).indexOf("ROLE_ADMIN") != -1,
            );
            const keyResponse = await Sentry.startSpan(
              { name: "getAppLaunchKey", op: "app.launch.key" },
              () =>
                AppLaunchController.generateAppLaunchKey({
                  headers: { "X-Tenant-Id": queryParams.tenantId },
                }),
            );
            if (keyResponse.data) {
              setAppLaunchKey(keyResponse.data);
            }
            const response = await Sentry.startSpan(
              { name: "launchOperation", op: "app.launch.operation" },
              () =>
                patientService.launchOperation({
                  patientId: queryParams.patientId,
                  caseId: queryParams.caseId,
                  clientId: queryParams.tenantId,
                  encounterId: queryParams.encounterId,
                  forceLaunch: queryParams.forceLaunch,
                }),
            );
            response.ifRight(async (data: ApplicationLaunchContext) => {
              logger.debug(
                "app-launch complete, launchBlocked:",
                data.launchBlocked,
              );
              if (data.launchBlocked && data.launchBlockedReason) {
                setLaunchBlockedReason(data.launchBlockedReason);
                return;
              }

              setContext(data);

              const appLaunchResult = await Sentry.startSpan(
                { name: "evaluateAppLaunch", op: "app.launch.evaluate" },
                () =>
                  AppLaunchRuleController.evaluate2({
                    path: {
                      patientId: queryParams.patientId,
                      caseId: queryParams.caseId,
                    },
                    body: {
                      timeZone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                    headers: { "X-Tenant-Id": queryParams.tenantId },
                  }),
              );
              if (isError(appLaunchResult)) {
                setLoading(false);
                setLaunchError({
                  e: appLaunchResult,
                  display: "Unable to evaluate patient record.",
                });
              } else {
                const appLaunchData = appLaunchResult.data;
                logger.debug(
                  "app-launch-rules:",
                  appLaunchData?.alerts?.length,
                  "alerts",
                );
                addAppLaunchAlerts(
                  (appLaunchData?.alerts ?? []).map(toHandRolledAlert),
                );
              }
              logger.debug(
                "Has previous unresolved tabs? ",
                data.hasPreviouslyUnresolvedTabs,
              );
              if (data.hasPreviouslyUnresolvedTabs) {
                promptToRestoreTabs(createRestoreMedsFromCurrentUserTab());
              }
              setLoading(false);
            });
            response.ifLeft((error) => {
              setLaunchError({
                e: error,
                display: "Unable to retrieve patient record.",
              });
              setLoading(false);
            });
          } else if (loginResult.type === "error") {
            setAuthenticated(false);
            setLoading(false);
            logger.warn("User unauthorized, error: ", loginResult.error);
          } else if (loginResult.type === "redirecting") {
            logger.debug("Redirecting...");
          }
        },
      );
    };
    registerWindowEventListeners();
    initiateApp();
    return () => {
      deregisterWindowEventListeners();
      guidanceTabs.getTabs().forEach((tab) => {
        guidanceTabs.clearStaleTimer(tab.name);
      });
    };
  }, []);

  useEffect(() => {
    if (context) {
      logger.debug("Context updated");
      if (context?.alerts && context.alerts.length > 0) {
        addAppLaunchAlerts(context.alerts);
      }
      logger.debug("Allow vital sign opt-in: ", context.allowVitalSignOptIn);
      logger.debug("vital signs opt in: ", context?.vitalSignRulesOptIn);
      if (
        context?.allowVitalSignOptIn &&
        context?.vitalSignRulesOptIn == null
      ) {
        // only prompt if we allow opt in and we don't have a setting set
        logger.debug("show vital sign prompt");
        promptForVitalSignAlertsOptIn();
      } else {
        // otherwise, we set based on whatever vitalSignRulesOptIn is set to. If null, attempt we should run vital sign alerts
        var enableVitalSignAlerts =
          context?.vitalSignRulesOptIn == null
            ? true
            : context?.vitalSignRulesOptIn;
        logger.debug("Notify on vital sign alerts: ", enableVitalSignAlerts);
        setNotifyOnVitalSignAlerts(enableVitalSignAlerts);
      }
    }
  }, [context]);

  const handleOptInResponse = (optIn: boolean) => {
    logger.debug("Updating opt-in: ", optIn);
    setNotifyOnVitalSignAlerts(optIn);
    guidanceTabs.removeTab(TabNames.VITAL_SIGNS_OPT_IN_TAB);
  };

  const acceptAppLaunchAlert = async (alert: AlertDefinition) => {
    logger.debug(
      "Dosing form alert accepted: ",
      appLaunchAlerts,
      " vs ",
      alert,
    );

    const response = await ruleExecutionResultService.submitResponse({
      patientId: queryParams.patientId,
      clientId: queryParams.tenantId,
      resultId: alert.resultId,
      accepted: true,
    });
    logger.debug("accept response: ", response);
    response.ifRight(() => {
      const updatedAppLaunchAlerts = appLaunchAlerts.filter(
        (appLaunchAlert) =>
          appLaunchAlert.ruleIdentifier !== alert.ruleIdentifier,
      );
      logger.debug("Updated app launch alerts: ", updatedAppLaunchAlerts);
      setAppLaunchAlerts(updatedAppLaunchAlerts);
      if (updatedAppLaunchAlerts.length === 0) {
        guidanceTabs.removeTab(TabNames.APP_LAUNCH_RULE_TAB);
      }
    });
  };

  const rejectAppLaunchAlert = async ({
    alert,
    rejectionOption,
    reason,
    reasonComment,
    rejectionReasonCustomInput,
  }: RejectAlertPayload): Promise<RejectAlertResponse> => {
    logger.debug(
      "Dosing form alert rejected:",
      alert,
      "reason:",
      reason,
      "input:",
      reasonComment,
    );
    const response = await ruleExecutionResultService.submitResponse({
      patientId: queryParams.patientId,
      clientId: queryParams.tenantId,
      resultId: alert.resultId,
      accepted: false,
      suppressFutureAlertsOfThisType: false,
      suppressFutureAlertsForThisAllergy: false,
      markMedicationAsTolerated: false,
      rejectionOption,
      reason,
      reasonComment,
      rejectionReasonCustomInput,
    });
    logger.debug("reject response", response);
    response.ifRight(() => {
      const updatedAppLaunchAlerts = appLaunchAlerts.filter(
        (appLaunchAlert) =>
          appLaunchAlert.ruleIdentifier !== alert.ruleIdentifier,
      );
      logger.debug("Updated app launch alerts: ", updatedAppLaunchAlerts);
      setAppLaunchAlerts(updatedAppLaunchAlerts);
      if (updatedAppLaunchAlerts.length === 0) {
        guidanceTabs.removeTab(TabNames.APP_LAUNCH_RULE_TAB);
      }
    });
    return response.caseOf(submitRuleResponseErrorToRejectAlertResponse);
    // TODO use id instead of ruleId?
    // TODO record the rejection
  };

  const acceptNotificationAlert = async (alert: AlertDefinition) => {
    logger.debug(
      "Dosing form alert accepted: ",
      appLaunchAlerts,
      " vs ",
      alert,
    );

    const response = await ruleExecutionResultService.submitResponse({
      patientId: queryParams.patientId,
      clientId: queryParams.tenantId,
      resultId: alert.resultId,
      accepted: true,
    });
    return response.isRight();
  };

  const restorePreviousTabsFromCurrentUser = async () => {
    const tab = guidanceTabs.getTab(
      TabNames.RESTORE_MEDS_FROM_CURRENT_USER_TAB,
    );
    var results = await userTabStateService.resolveTabs(
      queryParams.tenantId,
      queryParams.patientId,
      queryParams.caseId,
      tab?.created,
      RestorePromptTypeEnum.FROM_CURRENT_USER,
      RestoreTabResolutionEnum.RESTORED,
    );
    results.ifRight((data: MedicationSelectionCheckResponse[]) => {
      logger.debug("resolve tabs: ", data);
      if (isArray(data)) {
        data.forEach((medSelection) => {
          addMedication(medSelection);
        });
      } else {
        console.warn("no tabs to restore");
      }
      guidanceTabs.removeTab(TabNames.RESTORE_MEDS_FROM_CURRENT_USER_TAB);
    });

    results.ifLeft((error) => {
      logger.debug("error restoring tabs: ", error);
    });
  };

  const ignorePreviousTabsFromCurrentUser = () => {
    const tab = guidanceTabs.getTab(
      TabNames.RESTORE_MEDS_FROM_CURRENT_USER_TAB,
    );

    userTabStateService
      .resolveTabs(
        queryParams.tenantId,
        queryParams.patientId,
        queryParams.caseId,
        tab?.created,
        RestorePromptTypeEnum.FROM_CURRENT_USER,
        RestoreTabResolutionEnum.IGNORED,
      )
      .then((results) => {
        results.ifLeft((error) => {
          logger.debug("error ignoring tabs: ", error);
        });
      })
      .catch((error) => {
        logger.debug("error ignoring tabs: ", error);
      });
    guidanceTabs.removeTab(TabNames.RESTORE_MEDS_FROM_CURRENT_USER_TAB);
  };

  const restorePreviousTabsFromOtherUsers = async () => {
    const tab = guidanceTabs.getTab(TabNames.RESTORE_MEDS_FROM_OTHER_USERS_TAB);

    var results = await userTabStateService.resolveTabs(
      queryParams.tenantId,
      queryParams.patientId,
      queryParams.caseId,
      tab?.created,
      RestorePromptTypeEnum.FROM_OTHER_USERS,
      RestoreTabResolutionEnum.RESTORED,
    );
    logger.debug("resolve tabs: ", results);
    results.ifRight((data: MedicationSelectionCheckResponse[]) => {
      logger.debug("successful resove tabs: ", data);
      if (isArray(data)) {
        data.forEach((medSelection) => {
          addMedication(medSelection);
        });
      } else {
        console.warn("no tabs to restore");
      }
      guidanceTabs.removeTab(TabNames.RESTORE_MEDS_FROM_OTHER_USERS_TAB);
    });

    results.ifLeft((error) => {
      logger.debug("error restoring tabs: ", error);
    });
  };

  const ignorePreviousTabsFromOtherUsers = () => {
    const tab = guidanceTabs.getTab(TabNames.RESTORE_MEDS_FROM_OTHER_USERS_TAB);

    userTabStateService
      .resolveTabs(
        queryParams.tenantId,
        queryParams.patientId,
        queryParams.caseId,
        tab?.created,
        RestorePromptTypeEnum.FROM_OTHER_USERS,
        RestoreTabResolutionEnum.IGNORED,
      )
      .then((results) => {
        results.ifLeft((error) => {
          logger.debug("error ignoring tabs: ", error);
        });
      })
      .catch((error) => {
        logger.debug("error ignoring tabs: ", error);
      });
    guidanceTabs.removeTab(TabNames.RESTORE_MEDS_FROM_OTHER_USERS_TAB);
  };

  const rejectNotificationAlert = async ({
    alert,
    rejectionOption,
    reason,
    reasonComment,
    rejectionReasonCustomInput,
    suppressFutureAlertsOfThisType,
    suppressFutureAlertsForThisAllergy,
    markMedicationAsTolerated,
  }: RejectAlertPayload): Promise<RejectAlertResponse> => {
    logger.debug(
      "notification alert rejected:",
      alert,
      "reason:",
      reason,
      "input:",
      reasonComment,
    );
    const response = await ruleExecutionResultService.submitResponse({
      patientId: queryParams.patientId,
      clientId: queryParams.tenantId,
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
      logger.debug("will refetch", ruleSettings);
      const result = await ruleSettings.fetchRuleSettings();
      logger.debug("fetch done, result:", result);
    }

    return response.caseOf(submitRuleResponseErrorToRejectAlertResponse);
  };

  const checkForOutstandingTabsFromOtherUsers = async () => {
    const response =
      await userTabStateService.checkForOutstandingMedicationTabsFromOtherUsers(
        queryParams.tenantId,
        queryParams.patientId,
        queryParams.caseId,
      );
    return response.caseOf({
      Left: (error) => {
        logger.debug("error with checking for outstanding med tabs: ", error);
        return false;
      },
      Right: (hasOutstandingTabs: boolean) => {
        logger.debug("check for outstanding med tabs: ", hasOutstandingTabs);
        if (hasOutstandingTabs) {
          promptToRestoreTabs(createRestoreMedsFromOtherUsersTab());
        }
        return hasOutstandingTabs;
      },
    });
  };

  useEffect(() => {
    if (isOperationCompleted) {
      closeWindow(trackingEventService);
    }
    if (isOperationEnding) {
      checkForOutstandingTabsFromOtherUsers().then(() => {
        let hasTabs = guidanceTabs
          .getTabs()
          .some((tab) => tab.type !== TabType.MEDICATION_SELECTION_FORM);
        if (hasTabs) {
          focusWindow(trackingEventService);
        }
      });
    }
  }, [isOperationCompleted, isOperationEnding]);

  useEffect(() => {
    if (isOperationEnding) {
      let hasMedicationDosingForms = guidanceTabs.tabWithTypeExists(
        TabType.MEDICATION_DOSING_FORM,
        operationStatusTimestamp,
      );
      setShowIncompleteDosingWindowsWarning(hasMedicationDosingForms);
    }
  }, [operationStatus, operationStatusTimestamp, guidanceTabs.getTabs()]);

  // Track event when partial app launch occurs (integration failures)
  useEffect(() => {
    if (
      context &&
      context.integrationFailures &&
      context.integrationFailures.length > 0
    ) {
      recordEvent(EventType.PARTIAL_APP_LAUNCH, {
        failures: context.integrationFailures,
      });
    }
  }, [context, recordEvent]);

  const hasNMBReversalAlert = guidanceTabs.tabWithTitleExists("Reverse NMB");

  const onMedicationScanReminder = useCallback(() => {
    setShowMedicationScanReminder(true);
    // focus the window
    focusWindow(trackingEventService);
  }, []);

  const dismissUnknownBarcodeBanner = useCallback(() => {
    updatePendingBarcode(null);
    setMedicationScanError("");
    clearTimeout(clearMedicationScanErrorTimeout);
  }, [clearMedicationScanErrorTimeout]);

  if (launchBlockedReason) {
    return <LaunchBlockedDisplay reason={launchBlockedReason} />;
  }

  return loading ? (
    <Container fluid>
      {appLaunchKey && <AppLaunchLoadingDisplay appLaunchKey={appLaunchKey} />}
    </Container>
  ) : launchError ? (
    <Container fluid>
      <LaunchErrorDisplay error={launchError} />
    </Container>
  ) : authenticated ? (
    <>
      <div className="app-body">
        {!context ? (
          <></>
        ) : (
          <OperationHeartbeat>
            <main role="main" className="app-body__main">
              <Container fluid className="AppLaunch mt-3">
                <Row className="mb-3">
                  <PatientBanner
                    context={context}
                    showSettings={showSettings}
                    setShowSettings={setShowSettings}
                  />
                </Row>
                {homescreenHelpTooltipEnabled && (
                  <HelpTooltip
                    showFeedbackForm={() => setShowFeedbackWidget(true)}
                    rightOffset={sidebarWidth}
                  />
                )}
                <FeedbackWidget
                  show={showFeedbackWidget}
                  onHide={() => setShowFeedbackWidget(false)}
                />
                {context?.integrationFailureMessage && (
                  <Row>
                    <Col>
                      <Alert variant="warning" dismissible>
                        {context?.integrationFailureMessage}
                      </Alert>
                    </Col>
                  </Row>
                )}
                <Row>
                  <Col>
                    <FeatureFlagNoteViewer />
                  </Col>
                </Row>
                {!isOperationCompleted && showStaleDosingFormBanner && (
                  <Row>
                    <Col>
                      <Alert variant="warning">
                        <div>
                          Complete open medication tabs to save doses to the
                          EHR.
                        </div>
                      </Alert>
                    </Col>
                  </Row>
                )}
                {isOperationEnding &&
                  (hasNMBReversalAlert || showIncompleteDosingWindows) && (
                    <Row>
                      <Col>
                        <Alert variant="warning">
                          <div>
                            {hasNMBReversalAlert && (
                              <div>
                                Acknowledge NMB reversal alert before end of
                                case.
                              </div>
                            )}
                            {showIncompleteDosingWindows && (
                              <div>
                                Incomplete medication documentation will not be
                                saved to the EHR. Complete open medication tabs
                                before leaving the OR.
                              </div>
                            )}
                          </div>
                        </Alert>
                      </Col>
                    </Row>
                  )}
                <Row>
                  <Container fluid id="main-tab-container">
                    <ScanMedsReminderBanner
                      show={showMedicationScanReminder}
                      setShow={setShowMedicationScanReminder}
                    />
                    <Tabs
                      defaultActiveKey="medication-form"
                      id="tab-navigation"
                      className="mb-3"
                      activeKey={guidanceTabs.getSelectedTab()?.name}
                      onSelect={(tab) => guidanceTabs.selectTab(tab as TabID)}
                      variant="tabs"
                    >
                      {guidanceTabs.getTabs().map((tab: TabData) => {
                        const tabKey = tab.name;
                        const tabStyle = {
                          height: "28px",
                        };
                        const isSelected =
                          guidanceTabs.getSelectedTab()?.name === tabKey;
                        const className = `tab ${isSelected ? "selected" : ""}`;
                        let formDisplay;
                        let tabIcon: IconSpec | null = null;
                        switch (tab.type) {
                          case TabType.MEDICATION_SELECTION_FORM:
                            formDisplay = (
                              <Home
                                showSettings={showSettings}
                                setShowSettings={setShowSettings}
                                patientId={queryParams.patientId}
                                caseId={queryParams.caseId}
                                userId={queryParams.userId}
                                clientId={queryParams.tenantId}
                                medicationSelection={addMedication}
                                enableVitalSignOptIn={
                                  context.allowVitalSignOptIn
                                }
                                handleVitalSignsRuleOptIn={handleOptInResponse}
                                notifyOnVitalSignAlerts={
                                  notifyOnVitalSignAlerts
                                }
                                medicationScanError={medicationScanError}
                                onMedicationDropdownSelect={() => {
                                  setMedicationScanError("");
                                }}
                                onInvalidMedication={handleInvalidMedication}
                                onDismissMedicationScanError={
                                  pendingUnknownBarcode
                                    ? dismissUnknownBarcodeBanner
                                    : undefined
                                }
                                isSelected={isSelected}
                              ></Home>
                            );
                            break;
                          case TabType.VITAL_SIGN_OPT_IN:
                            formDisplay = (
                              <VitalSignRulesOptInPrompt
                                context={context}
                                userId={queryParams.userId}
                                onOptInResponse={handleOptInResponse}
                              />
                            );
                            break;
                          case TabType.PREOP_ALERTS:
                            formDisplay = (
                              <GuidanceAlert
                                title="Pre-op Alert"
                                alerts={appLaunchAlerts}
                                acceptAlert={acceptAppLaunchAlert}
                                rejectAlert={rejectAppLaunchAlert}
                              />
                            );
                            break;
                          case TabType.NOTIFICATION_ALERT:
                            formDisplay = (
                              <GuidanceAlert
                                title={tab.title}
                                alerts={tab.guidance}
                                playAlertSound={tab.playAlertSound}
                                created={tab.created?.toJSDate()}
                                acceptAlert={(result) => {
                                  acceptNotificationAlert(result);
                                  let remainingAlerts = tab.guidance?.filter(
                                    (alert) =>
                                      alert.resultId !== result.resultId,
                                  );
                                  if (
                                    remainingAlerts &&
                                    remainingAlerts.length > 0
                                  ) {
                                    guidanceTabs.updateTab(tab.name, {
                                      ...tab,
                                      guidance: remainingAlerts,
                                      playAlertSound: false,
                                    });
                                  } else {
                                    guidanceTabs.removeTab(tab.name);
                                  }
                                }}
                                rejectAlert={({
                                  alert,
                                  rejectionOption,
                                  reason,
                                  reasonComment,
                                  rejectionReasonCustomInput,
                                  suppressFutureAlertsOfThisType,
                                  suppressFutureAlertsForThisAllergy,
                                  markMedicationAsTolerated,
                                }: RejectAlertPayload) => {
                                  let response = rejectNotificationAlert({
                                    alert,
                                    rejectionOption,
                                    reason,
                                    reasonComment,
                                    rejectionReasonCustomInput,
                                    suppressFutureAlertsOfThisType,
                                    suppressFutureAlertsForThisAllergy,
                                    markMedicationAsTolerated,
                                  });
                                  let remainingAlerts = tab.guidance?.filter(
                                    (a) => a.resultId !== alert.resultId,
                                  );
                                  if (
                                    remainingAlerts &&
                                    remainingAlerts.length > 0
                                  ) {
                                    guidanceTabs.updateTab(tab.name, {
                                      ...tab,
                                      guidance: remainingAlerts,
                                      playAlertSound: false,
                                    });
                                  } else {
                                    guidanceTabs.removeTab(tab.name);
                                  }
                                  return response;
                                }}
                              />
                            );
                            break;
                          case TabType.MEDICATION_DOSING_FORM:
                            tabIcon = {
                              type: "medicationColor",
                              // TODO: we should pattern match on the tab type instead of using tabKey
                              colorSetting: tab.medication!.colorLabelSetting,
                            };
                            formDisplay = (
                              <DosingForm
                                tabKey={tabKey}
                                tabIsSelected={isSelected}
                                medication={tab.medication!}
                                patientId={queryParams.patientId}
                                caseId={queryParams.caseId}
                                userId={queryParams.userId}
                                clientId={queryParams.tenantId}
                                onDosingSave={dosingFormSave}
                                onDosingCancel={dosingFormCancel}
                                dosingFormState={tab.dosingFormState!}
                                trackingTabId={tab.trackingTabId!}
                                setCanCloseTab={(canClose) =>
                                  guidanceTabs.setCanCloseTab(
                                    tab.name,
                                    canClose,
                                  )
                                }
                                patient={context?.patient}
                                inductionTime={inductionTime}
                              ></DosingForm>
                            );
                            break;
                          case TabType.RESTORE_MEDS_FROM_CURRENT_USER:
                            formDisplay = (
                              <RestoreMedsPrompt
                                type={RestorePromptTypeEnum.FROM_CURRENT_USER}
                                ignorePreviousTabs={
                                  ignorePreviousTabsFromCurrentUser
                                }
                                restorePreviousTabs={
                                  restorePreviousTabsFromCurrentUser
                                }
                              ></RestoreMedsPrompt>
                            );
                            break;

                          case TabType.RESTORE_MEDS_FROM_OTHER_USERS:
                            formDisplay = (
                              <RestoreMedsPrompt
                                type={RestorePromptTypeEnum.FROM_OTHER_USERS}
                                ignorePreviousTabs={
                                  ignorePreviousTabsFromOtherUsers
                                }
                                restorePreviousTabs={
                                  restorePreviousTabsFromOtherUsers
                                }
                              ></RestoreMedsPrompt>
                            );
                            break;
                        }

                        // @ts-ignore
                        return (
                          <Tab
                            key={tabKey}
                            eventKey={tabKey}
                            title={
                              <div style={tabStyle} className={className}>
                                {tabIcon && <TabIcon icon={tabIcon} />}
                                <span style={{ verticalAlign: "middle" }}>
                                  {tab.title}
                                </span>

                                {tab.type == TabType.NOTIFICATION_ALERT && (
                                  <span
                                    className="ms-2"
                                    style={{ fontSize: "0.75em" }}
                                  >{`${tab.created?.toLocaleString(
                                    DateTime.TIME_24_SIMPLE,
                                  )}`}</span>
                                )}

                                {tab.canClose && (
                                  <X
                                    className="ms-2 tab-close-button"
                                    onClick={() => {
                                      if (
                                        tab.type ===
                                          TabType.MEDICATION_DOSING_FORM &&
                                        tab.trackingTabId
                                      ) {
                                        dosingFormCancel({
                                          tabKey: tab.name,
                                          resolution:
                                            RestoreTabResolutionEnum.USER_CANCELLED,
                                        });
                                        return;
                                      }
                                      guidanceTabs.removeTab(tab.name);
                                    }}
                                  />
                                )}
                              </div>
                            }
                          >
                            {formDisplay}
                          </Tab>
                        );
                      })}
                    </Tabs>
                  </Container>
                </Row>

                <div className="row mt-3 mx-1">
                  <div className="col-2">
                    <BarcodeInput
                      patientId={queryParams.patientId}
                      caseId={queryParams.caseId}
                      clientId={queryParams.tenantId}
                      inputRef={barcodeInput}
                      onNdcSelection={(data) => {
                        updatePendingBarcode(null);
                        setMedicationScanError("");
                        addMedication(data);
                      }}
                      onInvalidMedication={(error, barcode) =>
                        handleInvalidMedication(error, barcode)
                      }
                    />
                  </div>
                </div>
                {isAdmin && (
                  <div className="row">
                    <InAppDebugger
                      context={context}
                      setContext={setContext}
                      tabState={guidanceTabs}
                    />
                    <InAppAdminPanel
                      tenantId={queryParams.tenantId}
                      patientId={queryParams.patientId}
                      caseId={queryParams.caseId}
                    />
                  </div>
                )}
              </Container>
              <GuidanceSocket
                patientId={queryParams.patientId}
                caseId={queryParams.caseId}
                tenantId={queryParams.tenantId}
                guidanceNotification={onGuidanceNotification}
                guidanceOperationCompleted={onOperationCompleted}
                guidanceOperationEnding={onOperationEnding}
                onOperationUpdated={onOperationUpdated}
                onMedicationScanReminder={onMedicationScanReminder}
              />
            </main>
          </OperationHeartbeat>
        )}
        {medicationFavoritesEnabled && (
          <FavoritesSidebar
            ref={sidebarRef}
            onMedicationSelect={selectMedicationFromFavorites}
            onMacroSelect={selectMacroMedications}
          />
        )}
      </div>
      <Footer />
    </>
  ) : (
    <>
      <h3>Access Denied</h3>
    </>
  );
};

export default AppLaunch;
