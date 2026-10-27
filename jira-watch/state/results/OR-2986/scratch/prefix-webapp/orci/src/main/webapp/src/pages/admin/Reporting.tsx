import "../../App.scss";
import React, { useEffect, useState } from "react";
import { Button, Col, Container, Form, FormGroup, Row } from "react-bootstrap";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { ErrorMessage, Field, Formik, FormikErrors } from "formik";
import { DatePickerField } from "../../components/Form/DatePickerField";
import { useAuth } from "../../context/AuthContext";
import { isLoading } from "../../types/Loadable";
import Accordion from "react-bootstrap/Accordion";
import { DateTime } from "luxon";
import { TenantPickerFormikField } from "../../components/Admin/TenantPicker";

export function ReportingContent() {
  interface LaunchReport {
    tenantID: string;
    startDate: string;
    endDate: string;
  }

  var auth = useAuth();
  const [csrfToken, setCsrfToken] = useState<string>();
  useEffect(() => {
    if (isLoading(auth.csrfToken)) {
      return () => {};
    }
    setCsrfToken(auth.csrfToken.token);
  }, [auth]);

  var now = new Date();
  // Get the first day of the current month
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get the last day of the current month
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const today = new Date();

  return (
    <>
      <h1>Reporting</h1>

      <Accordion defaultActiveKey="0">
        <Accordion.Item eventKey="0">
          <Accordion.Header>ControlCheck Report</Accordion.Header>
          <Accordion.Body>
            <Formik
              initialValues={{
                client_id: null,
                start: today,
                end: today,
              }}
              initialErrors={{
                client_id: "required",
                start: "required",
                end: "required",
              }}
              validate={(values) => {
                const errors: FormikErrors<typeof values> = {};
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
              }}
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
              {({ isValid, errors, submitForm, handleReset }) => (
                <Form onSubmit={submitForm} onReset={handleReset}>
                  <FormGroup as={Row} className="align-items-center">
                    <Form.Label column sm={2}>
                      Tenant:{" "}
                    </Form.Label>
                    <Col sm={10}>
                      <TenantPickerFormikField name="client_id" />
                      <ErrorMessage
                        name="client_id"
                        component="div"
                        className="text-danger"
                      />
                    </Col>
                  </FormGroup>

                  <FormGroup as={Row} className="align-items-center">
                    <Form.Label column sm={2}>
                      Start Date:{" "}
                    </Form.Label>
                    <Col sm={4}>
                      <DatePickerField name="start" />
                      <ErrorMessage
                        name="start"
                        component="div"
                        className="text-danger"
                      />
                    </Col>
                    <Form.Label column sm={2}>
                      End Date:{" "}
                    </Form.Label>
                    <Col sm={4}>
                      <DatePickerField name="end" />
                      <ErrorMessage
                        name="end"
                        component="div"
                        className="text-danger"
                      />
                    </Col>
                  </FormGroup>
                  <Button type="submit" disabled={!isValid}>
                    Submit
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
              initialValues={{
                tenantID: null,
                startDate: firstDayOfMonth,
                endDate: lastDayOfMonth,
                csrfToken: csrfToken,
              }}
              initialErrors={{
                tenantID: "required",
                startDate: "required",
                endDate: "required",
              }}
              validate={(values) => {
                const errors: FormikErrors<typeof values> = {};
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
              }}
              onSubmit={() => {}}
            >
              {({ handleSubmit, isValid }) => (
                <Form
                  action="/api/admin/reporting/generate-launch-report"
                  method="POST"
                >
                  <Field type="hidden" name="_csrf" value={csrfToken} />
                  <FormGroup as={Row} className="align-items-center">
                    <Form.Label column sm={2}>
                      Tenant:{" "}
                    </Form.Label>
                    <Col sm={10}>
                      <TenantPickerFormikField name="tenantID" />
                      <ErrorMessage
                        name="tenantID"
                        component="div"
                        className="text-danger"
                      />
                    </Col>
                  </FormGroup>
                  <FormGroup as={Row} className="align-items-center">
                    <Form.Label column sm={2}>
                      Start Date:{" "}
                    </Form.Label>
                    <Col sm={4}>
                      <DatePickerField name="startDate" />
                      <ErrorMessage
                        name="startDate"
                        component="div"
                        className="text-danger"
                      />
                    </Col>
                    <Form.Label column sm={2}>
                      End Date:{" "}
                    </Form.Label>
                    <Col sm={4}>
                      <DatePickerField name="endDate" />
                      <ErrorMessage
                        name="endDate"
                        component="div"
                        className="text-danger"
                      />
                    </Col>
                  </FormGroup>
                  <Button type="submit" disabled={!isValid}>
                    Submit
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
    <Container fluid="md">
      <Header />
      <main role="main">
        <ReportingContent />
      </main>
      <Footer />
    </Container>
  );
}

export default Reporting;
