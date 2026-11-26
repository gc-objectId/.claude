import "../../App.scss";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import React, { useCallback, useEffect, useState } from "react";
import { Button, Form, Spinner } from "react-bootstrap";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import { isLoaded, isLoading, Loadable, loading } from "../../types/Loadable";
import axios from "axios";
import { snakeCaseToTitleCase } from "../../utils/stringUtils";
import { httpErrorMessage } from "../../utils/request";
import { useNow } from "../../hooks/hooks";
import { CaseID, PatientID, TenantID } from "../../types/identifiers";
import { ArrowCounterclockwise, Pencil } from "react-bootstrap-icons";
import { TenantPicker } from "../../components/Admin/TenantPicker";
import { sortBy } from "lodash";
import { DateTime } from "luxon"; //   "Anesthesia Start",
import { useAdminPanelContext } from "../../context/AdminPanelContext";
import { EventController } from "../../api/generated/sdk.gen";
import "./EventCenter.scss";

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
    if (!tenantId) {
      return () => {};
    }
    let superseded = false;
    setEventDefinitions(loading());
    (async () => {
      const { data } = await EventController.getEvents1({
        headers: { "X-Tenant-Id": tenantId },
      });
      if (superseded || !data) {
        return;
      }
      setEventDefinitions(
        Object.entries(data).map(([name, categories]) => ({
          name,
          categories,
        })),
      );
    })();
    return () => {
      superseded = true;
    };
  }, [tenantId]);

  const sendTimingEvent = useCallback(
    async (ev: EventDefinition) => {
      const label = snakeCaseToTitleCase(ev.name);
      try {
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
        toast.success(`Sent ${label}`);
      } catch (error) {
        toast.error(
          `${label} failed: ${httpErrorMessage(error, "unknown error")}`,
        );
      }
    },
    [patientId, caseId, eventTimestamp, tenantId],
  );

  return (
    <>
      <AdminPageHeader
        title="Event Center"
        meta="Send timing events to a case as if they arrived from the EHR."
      />
      <section className="event-center__context">
        <Form.Group
          controlId="eventTenant"
          className="event-center__field event-center__field--wide"
        >
          <Form.Label className="guided-eyebrow">Tenant</Form.Label>
          <TenantPicker
            inputId="eventTenant"
            value={tenantId}
            onChange={(ev) => setTenantId(ev as TenantID)}
          />
        </Form.Group>
        <Form.Group controlId="patientId" className="event-center__field">
          <Form.Label className="guided-eyebrow">PMRN</Form.Label>
          <Form.Control
            name="patientId"
            type="text"
            onChange={(e) => setPatientId(e.target.value as PatientID)}
            value={patientId ?? ""}
          />
        </Form.Group>
        <Form.Group controlId="caseId" className="event-center__field">
          <Form.Label className="guided-eyebrow">Case ID</Form.Label>
          <Form.Control
            name="caseId"
            type="text"
            onChange={(e) => setCaseId(e.target.value as CaseID)}
            value={caseId ?? ""}
          />
        </Form.Group>
        <Form.Group
          controlId="eventTimestamp"
          className="event-center__field event-center__field--wide"
        >
          <Form.Label className="guided-eyebrow">Event timestamp</Form.Label>
          {isEditingTimestamp ? (
            <div className="event-center__timestamp">
              <Form.Control
                name="eventTimestamp"
                type="datetime-local"
                step="1"
                onChange={(e) => {
                  if (e.target.value) {
                    setCustomTimestamp(new Date(e.target.value));
                  }
                }}
                value={DateTime.fromJSDate(eventTimestamp).toFormat(
                  "yyyy-MM-dd'T'HH:mm:ss",
                )}
              />
              <Button
                variant="link"
                className="event-center__timestamp-action"
                title="Reset to current time"
                onClick={() => {
                  setIsEditingTimestamp(false);
                  setCustomTimestamp(null);
                }}
              >
                <ArrowCounterclockwise size={18} aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <Button
              variant="link"
              className="event-center__timestamp-toggle"
              onClick={() => {
                setCustomTimestamp(now);
                setIsEditingTimestamp(true);
              }}
            >
              <span>{eventTimestamp.toLocaleString()}</span>
              <Pencil size={14} aria-hidden="true" />
            </Button>
          )}
        </Form.Group>
      </section>
      <section>
        <div className="event-center__events-header">
          <h2 className="guided-eyebrow">Events</h2>
          <p>Each event is sent to the case above at the event timestamp.</p>
        </div>
        {!tenantId ? (
          <div className="admin-empty">Choose a tenant to see its events.</div>
        ) : isLoaded(eventDefinitions) ? (
          <div className="event-grid">
            {sortBy(eventDefinitions, (it) => it.name).map((ev) => (
              <Button
                key={ev.name}
                variant="outline-primary"
                className="event-card"
                disabled={!tenantId || !caseId}
                onClick={() => sendTimingEvent(ev)}
              >
                <span className="event-card__name">
                  {snakeCaseToTitleCase(ev.name)}
                </span>
                {ev.categories.length > 0 && (
                  <span className="event-card__categories">
                    {ev.categories.map(snakeCaseToTitleCase).join(" · ")}
                  </span>
                )}
              </Button>
            ))}
          </div>
        ) : (
          <Spinner size="sm" />
        )}
      </section>
    </>
  );
}

function EventCenter() {
  return (
    <AdminPage>
      <EventCenterContent />
    </AdminPage>
  );
}

export default EventCenter;
