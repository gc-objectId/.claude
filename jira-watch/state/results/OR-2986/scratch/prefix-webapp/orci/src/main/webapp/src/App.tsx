import "./App.scss";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import AppLaunch from "./pages/AppLaunch";
import AllergyReactionList from "./pages/admin/AllergyReactionList";
import MedicationList from "./pages/admin/MedicationList";
import MedicationAdministrationsSimulation from "./pages/admin/MedicationAdministrationsSimulation";
import MedicationAdministrationSimulation from "./pages/admin/MedicationAdministrationSimulation";

import { AppLaunchWrapper } from "./pages/AppLaunchWrapper";
import { LoginPage } from "./pages/LoginPage";
import React, { useEffect } from "react";
import axios from "axios";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { LogoutPage } from "./pages/LogoutPage";
import { APITokenAdmin } from "./pages/admin/APIToken";
import { WebsocketProvider } from "./context/WebsocketContext";
import { useInactivityTimeout } from "./hooks/useInactivityTimeout";
import { SSOResponse } from "./pages/SSOResponse";
import { DevModeBanner } from "./components/DevModeBanner";
import { useWindowFocusHandler } from "./hooks/useWindowFocusHandler";
import Reporting from "./pages/admin/Reporting";
import { MedicationAdministrationNotificationForm } from "./pages/admin/MedicationAdministrationNotificationForm";
import EventCenter from "./pages/admin/EventCenter";
import PatientTemplateList from "./pages/admin/templates/PatientTemplateList";
import PatientList from "./pages/admin/PatientList";
import ViewPatient from "./pages/admin/ViewPatient";
import ViewOperation from "./pages/admin/ViewOperation";
import { Feedback } from "./pages/admin/Feedback";
import { ReleaseNotesPage } from "./pages/admin/ReleaseNotes";
import { FeatureFlags } from "./pages/admin/FeatureFlags";
import MedicationAdministrationDefaultNDCsSimulation from "./pages/admin/MedicationAdministrationDefaultNDCsSimulation";
import { ManageDataAdmin } from "./pages/admin/ManageDataAdmin";
import JobQueue from "./pages/admin/JobQueue";
import IntegrationHarness from "./pages/admin/IntegrationHarness";
import HL7Messages from "./pages/admin/HL7Messages";
import { client } from "@api/client.gen";
import { deriveTenantId } from "./utils/tenant";
import { reportHttpError } from "./utils/request";
import { TenantID } from "./types/identifiers";
import { Toaster } from "react-hot-toast";

import { logger } from "./utils/logger";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: import.meta.env.DEV,
    },
  },
});

const resolveXsrfToken = () => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
};

client.setConfig({
  baseURL: "", // API requests all target current host
});

// Root bare axios calls at the origin. Without this a relative path literal resolves
// against the current route, which is correct only from a single-segment route.
axios.defaults.baseURL = "/";

// configure the generated API's axios client
client.instance.interceptors.request.use((config) => {
  // use the provided tenant or fallback to the derived tenant id
  const tenantId =
    config.headers.get("X-Tenant-Id") ?? (deriveTenantId() as TenantID | null);
  if (tenantId) {
    config.headers.set("X-Tenant-Id", tenantId);
  }
  const xsrfToken = resolveXsrfToken();
  if (xsrfToken) {
    config.headers.set("X-XSRF-TOKEN", xsrfToken);
  }
  return config;
});

client.instance.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response) {
    const { status } = error.response;
    if (status >= 400 && status < 500) {
      const tenantId = error.config?.headers.get("X-Tenant-Id");
      reportHttpError(
        status,
        error.config?.method,
        typeof tenantId === "string" ? tenantId : undefined,
      );
    }
  }
  return Promise.reject(error);
});

const App = () => {
  useEffect(() => {
    // TODO require authentication
    axios
      .get("/actuator/info")
      .then((response) => {
        logger.debug("build info:", response.data);
      })
      .catch((error) => {});
  }, []);

  useWindowFocusHandler();

  useInactivityTimeout();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebsocketProvider>
          <DevModeBanner />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sso-response" element={<SSOResponse />} />
            <Route
              path="/app-launch"
              element={
                <AppLaunchWrapper>
                  <AppLaunch />
                </AppLaunchWrapper>
              }
            />
            <Route path="logout" element={<LogoutPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/admin">
              <Route
                path="medications"
                element={
                  <ProtectedRoute>
                    <MedicationList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="manage-data"
                element={
                  <ProtectedRoute>
                    <ManageDataAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="api-tokens"
                element={
                  <ProtectedRoute>
                    <APITokenAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="allergy-reactions"
                element={
                  <ProtectedRoute>
                    <AllergyReactionList />
                  </ProtectedRoute>
                }
              />

              <Route
                path="simulation/med-admin"
                element={
                  <ProtectedRoute>
                    <MedicationAdministrationSimulation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="simulation/med-admins"
                element={
                  <ProtectedRoute>
                    <MedicationAdministrationsSimulation />
                  </ProtectedRoute>
                }
              />

              <Route
                path="simulation/med-admin-default-ndcs"
                element={
                  <ProtectedRoute>
                    <MedicationAdministrationDefaultNDCsSimulation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="simulation/med-admin-notification"
                element={
                  <ProtectedRoute>
                    <MedicationAdministrationNotificationForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="integration-harness"
                element={
                  <ProtectedRoute>
                    <IntegrationHarness />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reporting"
                element={
                  <ProtectedRoute>
                    <Reporting />
                  </ProtectedRoute>
                }
              />
              <Route
                path="feedback-submissions"
                element={
                  <ProtectedRoute>
                    <Feedback />
                  </ProtectedRoute>
                }
              >
                <Route
                  path=":feedbackId"
                  element={
                    <ProtectedRoute>
                      <Feedback />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route
                path="release-notes"
                element={
                  <ProtectedRoute>
                    <ReleaseNotesPage />
                  </ProtectedRoute>
                }
              >
                <Route
                  path=":releaseNoteId"
                  element={
                    <ProtectedRoute>
                      <ReleaseNotesPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route
                path="feature-flags"
                element={
                  <ProtectedRoute>
                    <FeatureFlags />
                  </ProtectedRoute>
                }
              >
                <Route
                  path=":featureFlagId"
                  element={
                    <ProtectedRoute>
                      <FeatureFlags />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route
                path="event-center"
                element={
                  <ProtectedRoute>
                    <EventCenter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="patients/:id"
                element={
                  <ProtectedRoute>
                    <ViewPatient />
                  </ProtectedRoute>
                }
              />
              <Route
                path="patients"
                element={
                  <ProtectedRoute>
                    <PatientList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="patients/:patientUuid/operations/:operationUuid/debugger"
                element={
                  <ProtectedRoute>
                    <ViewOperation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="job-queue"
                element={
                  <ProtectedRoute>
                    <JobQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="hl7-messages"
                element={
                  <ProtectedRoute>
                    <HL7Messages />
                  </ProtectedRoute>
                }
              />
              <Route path="templates">
                <Route
                  path="patients"
                  element={
                    <ProtectedRoute>
                      <PatientTemplateList />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Route>
          </Routes>
          <Toaster />
        </WebsocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
