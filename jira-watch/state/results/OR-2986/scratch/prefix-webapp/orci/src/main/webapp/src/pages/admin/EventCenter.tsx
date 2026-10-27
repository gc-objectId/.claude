import "../../App.scss";
import React, { useCallback, useEffect, useState } from "react";
import { Button, Container, Form } from "react-bootstrap";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { useAuth } from "../../context/AuthContext";
import { isLoaded, isLoading, Loadable, loading } from "../../types/Loadable";
import Stack from "react-bootstrap/Stack";
import axios from "axios";
import { snakeCaseToTitleCase } from "../../utils/stringUtils";
import { useNow } from "../../hooks/hooks";
import { CaseID, PatientID, TenantID } from "../../types/identifiers";
import { ArrowCounterclockwise, Pencil } from "react-bootstrap-icons";
import { TenantPicker } from "../../components/Admin/TenantPicker";
import { sortBy } from "lodash";
import { DateTime } from "luxon"; //   "Anesthesia Start",
import { useAdminPanelContext } from "../../context/AdminPanelContext";

type EventDefinition = {
  name: string;
  categories: string[];
};

export function EventCenterContent() {
  const {
    tenantId: ctxTenantId,
    patientId: ctxPatientId,
    caseId: ctxCaseId,
  } = useAdminPanelContext();
  const auth = useAuth();
  const [csrfToken, setCsrfToken] = useState<string>();
  useEffect(() => {
    if (isLoading(auth.csrfToken)) {
      return () => {};
    }
    setCsrfToken(auth.csrfToken.token);
  }, [auth]);

  const now = useNow();
  const [customTimestamp, setCustomTimestamp] = useState<Date | null>(null);
  const [isEditingTimestamp, setIsEditingTimestamp] = useState(false);
  const eventTimestamp = customTimestamp ?? now;
  const [tenantId, setTenantId] = useState<TenantID | undefined>(ctxTenantId);
  const [patientId, setPatientId] = useState<PatientID | undefined>(
    ctxPatientId,
  );
  const [caseId, setCaseId] = useState<CaseID | undefined>(ctxCaseId);
  const [eventDefinitions, setEventDefinitions] = useState<
    Loadable<EventDefinition[]>
  >(loading());

  useEffect(() => {
    (async () => {
      const events = await axios.get("/api/admin/events");
      setEventDefinitions(
        Object.entries(events.data).map(([name, categories]) => ({
          name,
          categories: categories as string[],
        })),
      );
    })();
  }, []);

  const sendTimingEvent = useCallback(
    async (ev: EventDefinition) => {
      await axios.post(
        `/api/admin/events/category-event?client_id=${tenantId}`,
        {
          sourceEventType: ev.name,
          eventCategories: ev.categories,
          patientId: patientId,
          caseId: caseId,
          date: eventTimestamp.toISOString(),
        },
        {
          headers: {
            "X-Tenant-Id": tenantId,
          },
        },
      );
    },
    [patientId, caseId, eventTimestamp, tenantId],
  );

  return (
    <>
      <h1>Event Center</h1>
      <TenantPicker
        value={tenantId}
        onChange={(ev) => setTenantId(ev as TenantID)}
      />
      <Form.Group className="mt-3 mb-3" controlId="patientId">
        <Form.Label className="fw-bold me-3">PMRN:</Form.Label>
        <Form.Control
          name="patientId"
          style={{ width: "200px", display: "inline-block" }}
          type="text"
          placeholder=""
          className="me-1"
          onChange={(e) => setPatientId(e.target.value as PatientID)}
          value={patientId}
        />
      </Form.Group>
      <Form.Group className="mt-3 mb-3" controlId="caseId">
        <Form.Label className="fw-bold me-3">Case ID:</Form.Label>
        <Form.Control
          name="caseId"
          style={{ width: "200px", display: "inline-block" }}
          type="text"
          placeholder=""
          className="me-1"
          onChange={(e) => setCaseId(e.target.value as CaseID)}
          value={caseId}
        />
      </Form.Group>
      <Form.Group className="mt-3 mb-3" controlId="eventTimestamp">
        <Form.Label className="fw-bold me-3">Event Timestamp:</Form.Label>
        {isEditingTimestamp ? (
          <>
            <Form.Control
              name="eventTimestamp"
              style={{ width: "250px", display: "inline-block" }}
              type="datetime-local"
              step="1"
              className="me-1"
              onChange={(e) => {
                if (e.target.value) {
                  setCustomTimestamp(new Date(e.target.value));
                }
              }}
              value={DateTime.fromJSDate(eventTimestamp).toFormat(
                "yyyy-MM-dd'T'HH:mm:ss",
              )}
            />
            <ArrowCounterclockwise
              role="button"
              title="reset to current time"
              className="ms-2"
              size={20}
              onClick={() => {
                setIsEditingTimestamp(false);
                setCustomTimestamp(null);
              }}
            />
          </>
        ) : (
          <span
            role="button"
            onClick={() => {
              setCustomTimestamp(now);
              setIsEditingTimestamp(true);
            }}
          >
            <span>{eventTimestamp.toLocaleString()}</span>
            <Pencil className="ms-2" size={16} />
          </span>
        )}
      </Form.Group>
      <Stack gap={3}>
        {isLoaded(eventDefinitions) &&
          sortBy(eventDefinitions, (it) => it.name).map((ev) => (
            <Button key={ev.name} onClick={() => sendTimingEvent(ev)}>
              {snakeCaseToTitleCase(ev.name)}
            </Button>
          ))}
      </Stack>
    </>
  );
}

function EventCenter() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main">
        <EventCenterContent />
      </main>
      <Footer />
    </Container>
  );
}

export default EventCenter;
