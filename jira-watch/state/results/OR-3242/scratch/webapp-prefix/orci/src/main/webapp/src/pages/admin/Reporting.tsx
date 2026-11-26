import "../../App.scss";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";

import { ErrorMessage, Field, Formik, FormikErrors } from "formik";
import { DatePickerField } from "../../components/Form/DatePickerField";
import { useAuth } from "../../context/AuthContext";
import { isLoading } from "../../types/Loadable";
import Accordion from "react-bootstrap/Accordion";
import { DateTime } from "luxon";
import { TenantPickerFormikField } from "../../components/Admin/TenantPicker";
import { useAdminPanelContext } from "../../context/AdminPanelContext";
import { TenantID } from "../../types/identifiers";

type ControlCheckValues = {
  client_id: TenantID | null;
  start: Date;
  end: Date;
};

type LaunchDetailsValues = {
  tenantID: TenantID | null;
  startDate: Date;
  endDate: Date;
  csrfToken?: string;
};

function validateControlCheck(values: ControlCheckValues) {
  const errors: FormikErrors<ControlCheckValues> = {};
  if (!values.client_id) {
    errors.client_id = "Tenant ID is required";
  }
  if (!values.start) {
    errors.start = "Start date is required";
  }
  if (!values.end) {
    errors.end = "End date is required";
  }
  return errors;
}

function validateLaunchDetails(values: LaunchDetailsValues) {
  const errors: FormikErrors<LaunchDetailsValues> = {};
  if (!values.tenantID) {
    errors.tenantID = "Tenant ID is required";
  }
  if (!values.startDate) {
    errors.startDate = "Start date is required";
  }
  if (!values.endDate) {
    errors.endDate = "End date is required";
  }
  return errors;
}

function ReportField({
  name,
  label,
  children,
  wide = false,
}: {
  name: string;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Form.Group
      controlId={name}
      className={wide ? "admin-field admin-field--wide" : "admin-field"}
    >
      <Form.Label className="guided-eyebrow">{label}</Form.Label>
      {children}
      <ErrorMessage name={name} component="div" className="text-danger" />
    </Form.Group>
  );
}

export function ReportingContent() {
  const { tenantId: ctxTenantId } = useAdminPanelContext();
  const auth = useAuth();
  const [csrfToken, setCsrfToken] = useState<string>();
  useEffect(() => {
    if (isLoading(auth.csrfToken)) {
      return () => {};
    }
    setCsrfToken(auth.csrfToken.token);
  }, [auth]);

  const now = new Date();
  // Get the first day of the current month
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get the last day of the current month
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const today = new Date();
  const controlCheckInitialValues: ControlCheckValues = {
    client_id: ctxTenantId ?? null,
    start: today,
    end: today,
  };
  const launchDetailsInitialValues: LaunchDetailsValues = {
    tenantID: ctxTenantId ?? null,
    startDate: firstDayOfMonth,
    endDate: lastDayOfMonth,
    csrfToken: csrfToken,
  };

  return (
    <>
      <AdminPageHeader
        title="Reporting"
        meta="Case, rule, and usage reports, downloaded for a tenant and date range."
      />

      <Accordion defaultActiveKey="0" className="admin-accordion">
        <Accordion.Item eventKey="0">
          <Accordion.Header>ControlCheck Report</Accordion.Header>
          <Accordion.Body>
            <Formik
              initialValues={controlCheckInitialValues}
              initialErrors={validateControlCheck(controlCheckInitialValues)}
              validate={validateControlCheck}
              onSubmit={(values) => {
                let url: string;
                if (window.location.host.startsWith("localhost")) {
                  url = "http://localhost:8080/api/admin/control-check/csv";
                } else {
                  url = "/api/admin/control-check/csv";
                }
                let start = DateTime.fromJSDate(values.start)
                  .startOf("day")
                  .toISO();
                let end = DateTime.fromJSDate(values.end).endOf("day").toISO();
                url = `${url}?client_id=${values.client_id}&start=${start}&end=${end}`;
                window.open(url);
              }}
            >
              {({ isValid, submitForm, handleReset }) => (
                <Form onSubmit={submitForm} onReset={handleReset}>
                  <div className="admin-filters">
                    <ReportField name="client_id" label="Tenant" wide>
                      <TenantPickerFormikField name="client_id" />
                    </ReportField>
                    <ReportField name="start" label="Start date">
                      <DatePickerField name="start" className="form-control" />
                    </ReportField>
                    <ReportField name="end" label="End date">
                      <DatePickerField name="end" className="form-control" />
                    </ReportField>
                  </div>
                  <Button type="submit" disabled={!isValid}>
                    Download CSV
                  </Button>
                </Form>
              )}
            </Formik>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="1">
          <Accordion.Header>Launch Details Report</Accordion.Header>
          <Accordion.Body>
            <Formik
              initialValues={launchDetailsInitialValues}
              initialErrors={validateLaunchDetails(launchDetailsInitialValues)}
              validate={validateLaunchDetails}
              onSubmit={() => {}}
            >
              {({ isValid }) => (
                <Form
                  action="/api/admin/reporting/generate-launch-report"
                  method="POST"
                >
                  <Field type="hidden" name="_csrf" value={csrfToken} />
                  <div className="admin-filters">
                    <ReportField name="tenantID" label="Tenant" wide>
                      <TenantPickerFormikField name="tenantID" />
                    </ReportField>
                    <ReportField name="startDate" label="Start date">
                      <DatePickerField
                        name="startDate"
                        className="form-control"
                      />
                    </ReportField>
                    <ReportField name="endDate" label="End date">
                      <DatePickerField
                        name="endDate"
                        className="form-control"
                      />
                    </ReportField>
                  </div>
                  <Button type="submit" disabled={!isValid}>
                    Download report
                  </Button>
                </Form>
              )}
            </Formik>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </>
  );
}

function Reporting() {
  return (
    <AdminPage>
      <ReportingContent />
    </AdminPage>
  );
}

export default Reporting;
