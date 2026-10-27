import React from "react";
import ReactDOM from "react-dom/client";
import "./index.scss";
import * as Sentry from "@sentry/react";
import ErrorPage from "./pages/ErrorPage";

import App from "./App";
import { BrowserRouter as Router } from "react-router-dom";
import { cloneDeepWith, isString } from "lodash";

const KEYS_TO_REDACT = [
  // HIPAA Safe Harbor identifiers (45 CFR 164.514(b)(2)) that this frontend handles:
  // names (1), dates tied to an individual (3), medical record numbers (8), and other
  // unique identifying codes (18). Clinical content is not an identifier and is kept,
  // so a breadcrumb still says what happened once the patient is unidentifiable.
  "pmrn",
  "mrn",
  "patientId",
  "queryPatientId",
  "notificationPmrn",
  "epicPatientId",
  "encounterCSN",
  "encounterId",
  "firstName",
  "lastName",
  "fullName",
  "preferredFirstName",
  "preferredLastName",
  "dob",
  "gender",
  "genderIdentity",
];

// Patient identifiers ride in URL path segments (/api/patient/<mrn>/...), which
// searchParams cannot reach.
const SENSITIVE_PATH_SEGMENTS =
  /\/(patient|patients|pmrn|case|cases|encounter)\/[^/?#\s]+/gi;

const redactPathIds = (text) =>
  typeof text === "string"
    ? text.replace(SENSITIVE_PATH_SEGMENTS, (_m, seg) => `/${seg}/[REDACTED]`)
    : text;

const hostname = window.location.hostname.toLowerCase();
const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

const normalizeDomain = (hostname) => {
  return (
    hostname.match(
      /^(?:[a-z0-9-]+\.)?(guidedor(?:-dev|-stage)?\.guidedclinical\.com)$/,
    )?.[1] || hostname
  );
};
const sentryEnvironment = normalizeDomain(hostname);
const isProdEnvironment =
  sentryEnvironment === "guidedor.guidedclinical.com" ||
  sentryEnvironment === "guidedor.partners.org";

const shouldInitSentry = !isLocal;

if (shouldInitSentry) {
  function sanitizeUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;

      // List of query parameters to redact
      const sensitiveParams = [
        "patient_id",
        "case_id",
        "pmrn",
        "encounter_id",
        "EpicSourceAuth",
        "EpicSourceClient",
        "EpicSourceSeq",
      ];

      sensitiveParams.forEach((param) => {
        if (params.has(param)) {
          params.set(param, "[REDACTED]");
        }
      });

      return redactPathIds(parsedUrl.toString());
    } catch (error) {
      return redactPathIds(url);
    }
  }

  // cloneDeepWith hands back Errors and other non-plain objects by reference, so a
  // key-based walk never reaches the response body, headers or request config they
  // carry. Reduce each console argument to a shape that cannot hold a payload.
  function safeConsoleArgument(value) {
    try {
      if (value === null || value === undefined) return value;
      if (typeof value === "string") return redactPathIds(value);
      if (typeof value === "number" || typeof value === "boolean") return value;
      if (value instanceof Error) {
        return `${value.name}: ${redactPathIds(value.message)}`;
      }
      const prototype = Object.getPrototypeOf(value);
      if (
        Array.isArray(value) ||
        prototype === Object.prototype ||
        prototype === null
      ) {
        return cloneDeepWith(value, (nested, key) => {
          if (KEYS_TO_REDACT.includes(key)) return "[REDACTED]";
          if (nested instanceof Error) {
            return `${nested.name}: ${redactPathIds(nested.message)}`;
          }
          if (isString(nested)) return redactPathIds(nested);
          return undefined;
        });
      }
      return `[${prototype?.constructor?.name ?? "Object"}]`;
    } catch (error) {
      return "[Unserializable]";
    }
  }

  Sentry.init({
    dsn: "https://da931460de6a31768b6649844bc5d0bb@o4508852193525760.ingest.us.sentry.io/4508853390016512",
    environment: sentryEnvironment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.httpClientIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: isProdEnvironment ? 1.0 : 0.1,
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: [
      /^https:\/\/guidedor-dev\.partners\.org/,
      /^https:\/\/guidedor\.partners\.org/,
      /^https:\/\/guidedor-dev\.guidedclinical\.com/,
      /^https:\/\/guidedor-stage\.guidedclinical\.com/,
      /^https:\/\/guidedor\.guidedclinical\.com/,
      /^https:\/\/[a-z0-9-]+\.guidedor(?:-dev|-stage)?\.guidedclinical\.com/,
    ],
    // Session Replay
    replaysSessionSampleRate: 0.0, // disable sampling for replays. Rely on sampling rate for errors only
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "console") {
        // drop log/info/debug breadcrumbs entirely — they frequently carry
        // full clinical payloads and provide little diagnostic value
        if (["log", "info", "debug"].includes(breadcrumb.level)) {
          return null;
        }

        // redact PHI fields from warn/error breadcrumbs
        if (breadcrumb.data && Array.isArray(breadcrumb.data.arguments)) {
          breadcrumb.data.arguments =
            breadcrumb.data.arguments.map(safeConsoleArgument);
        }
      }

      return breadcrumb;
    },

    beforeSend(event) {
      // Sanitize main request URL
      try {
        if (event.request?.url) {
          event.request.url = sanitizeUrl(event.request.url);
        }
      } catch (error) {}

      // Sanitize current page URL
      try {
        if (event.url) {
          event.url = sanitizeUrl(event.url);
        }
      } catch (error) {}

      // Sanitize headers
      try {
        if (event.request?.headers) {
          Object.entries(event.request.headers).forEach(([key, value]) => {
            if (typeof value === "string" && value.includes("http")) {
              event.request.headers[key] = sanitizeUrl(value);
            }
          });
        }
      } catch (error) {}

      // Sanitize exception values (stack traces)
      try {
        if (event.exception?.values) {
          event.exception.values = event.exception.values.map((exception) => ({
            ...exception,
            value: exception.value?.replace(/https?:\/\/[^\s]+/g, sanitizeUrl),
          }));
        }
      } catch (error) {}

      // Sanitize breadcrumbs
      try {
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
            if (breadcrumb.data?.url) {
              breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url);
            }
            if (breadcrumb.message?.includes("http")) {
              breadcrumb.message = breadcrumb.message.replace(
                /https?:\/\/[^\s]+/g,
                sanitizeUrl,
              );
            }
            return breadcrumb;
          });
        }
      } catch (error) {}

      // Sanitize span descriptions
      try {
        if (event.spans) {
          event.spans = event.spans.map((span) => {
            // Sanitize description if it exists
            if (span.description) {
              // Sanitize URLs in description
              span.description = span.description.replace(
                /https?:\/\/[^\s]+/g,
                (url) => sanitizeUrl(url),
              );
            }

            return span;
          });
        }
      } catch (error) {}

      return event;
    },
    beforeSendTransaction(event) {
      // Omit traces for the index route
      if (event.transaction === "/") {
        return null;
      }
      if (event.transaction) {
        event.transaction = sanitizeUrl(event.transaction);
      }
      if (
        event.contexts?.trace?.op === "http.client" &&
        event.contexts.trace.url
      ) {
        event.contexts.trace.url = sanitizeUrl(event.contexts.trace.url);
      }

      // Sanitize span descriptions in transaction events
      try {
        if (event.spans) {
          event.spans = event.spans.map((span) => {
            // Sanitize description if it exists
            if (span.description) {
              // Sanitize URLs in description
              span.description = span.description.replace(
                /https?:\/\/[^\s]+/g,
                (url) => sanitizeUrl(url),
              );
            }

            return span;
          });
        }
      } catch (error) {}

      return event;
    },
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Router>
    <Sentry.ErrorBoundary fallback={<ErrorPage />} handled={false}>
      <App />
    </Sentry.ErrorBoundary>
  </Router>,
);
