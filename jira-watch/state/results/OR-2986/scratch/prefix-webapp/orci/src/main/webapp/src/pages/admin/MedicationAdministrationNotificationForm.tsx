import { Button, Col, Container, Form, FormGroup, Row } from "react-bootstrap";
import React from "react";
import {
  ErrorMessage,
  Field,
  Formik,
  FormikErrors,
  FormikHelpers,
} from "formik";
import { TenantPickerField } from "../../components/Form/TenantPickerField";
import { useAuth } from "../../context/AuthContext";
import { isLoggedIn } from "../../types/User";
import { SimulationController } from "../../api/generated/sdk.gen";
import { TenantID } from "../../types/identifiers";
import { DatePickerField } from "../../components/Form/DatePickerField";
import Header from "../../components/Header";
import { SimulateMedAdminNotificationDto } from "../../api/generated/types.gen";
import { useAdminPanelContext } from "../../context/AdminPanelContext";

interface FormValues {
  tenant_id: string;
  username: string;
  pmrn: string | null;
  clientMedicationId: string;
  medicationOrderId: string;
  encounterCSN: string;
  administrationDate: Date;
  generatedPayload: string;
  sendNotification: boolean;
  notificationType: NonNullable<
    SimulateMedAdminNotificationDto["notificationType"]
  >;
  isEdit: boolean;
}

export function MedicationAdministrationNotificationFormContent() {
  const { tenantId: ctxTenantId, patientId: ctxPatientId } =
    useAdminPanelContext();
  var auth = useAuth();
  var currentUser = isLoggedIn(auth.user) ? auth.user.name : "";

  const defaultTime = new Date();
  defaultTime.setSeconds(0, 0);
  const initialValues: FormValues = {
    tenant_id: ctxTenantId ?? "mgb-mgh",
    username: currentUser,
    pmrn: ctxPatientId ?? "",
    clientMedicationId: "1445",
    medicationOrderId: "4502915",
    encounterCSN: "2001220705",
    administrationDate: defaultTime,
    generatedPayload: "",
    sendNotification: false,
    notificationType: "GIVEN",
    isEdit: false,
  };

  const handleSubmit = async (
    values: FormValues,
    formikHelpers: FormikHelpers<FormValues>,
  ) => {
    try {
      formikHelpers.setFieldValue("generatedPayload", "");
      const body: SimulateMedAdminNotificationDto = {
        clientMedicationId: values.clientMedicationId,
        pmrn: values.pmrn ?? undefined,
        medicationOrderId: values.medicationOrderId,
        administrationDate: values.administrationDate.toISOString(),
        username: values.username,
        encounterCSN: values.encounterCSN,
        notificationType: values.notificationType,
        edit: values.isEdit,
      };
      const headers = { "X-Tenant-Id": values.tenant_id as TenantID };
      const request = values.sendNotification
        ? SimulationController.sendMedAdminNotification
        : SimulationController.generateMedAdminNotification;
      const { data, error } = await request({ body, headers });
      if (data !== undefined) {
        formikHelpers.setFieldValue("generatedPayload", data);
      } else {
        formikHelpers.setFieldValue(
          "generatedPayload",
          error ? String(error) : "Request failed",
        );
      }
    } finally {
      formikHelpers.setSubmitting(false);
    }
  };

  return (
    <>
      <h1>Medication Administration Notification</h1>
      <Formik
        initialValues={initialValues}
        initialErrors={{
          tenant_id: "required",
          pmrn: "required",
          clientMedicationId: "required",
          medicationOrderId: "required",
        }}
        validate={(values) => {
          const errors: FormikErrors<typeof values> = {};
          if (!values.tenant_id) {
            errors.tenant_id = "Tenant ID is required";
          }
          if (!values.clientMedicationId) {
            errors.clientMedicationId = "Client Medication ID is required";
          }
          if (!values.medicationOrderId) {
            errors.medicationOrderId = "Medication Order ID is required";
          }
          if (!values.pmrn) {
            errors.pmrn = "PMRN is required";
          }
          return errors;
        }}
        onSubmit={handleSubmit}
      >
        {({ setFieldValue, values, isSubmitting, submitForm, isValid }) => (
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              if (isValid) {
                submitForm();
              }
            }}
          >
            <FormGroup as={Row} className="align-items-center">
              <Form.Label column sm={2}>
                User:{" "}
              </Form.Label>
              <Col sm={10}>
                <Field type="text" name="username" placeholder="" />

                <ErrorMessage
                  name="username"
                  component="div"
                  className="text-danger"
                />
              </Col>
            </FormGroup>
            <FormGroup as={Row} className="align-items-center">
              <Form.Label column sm={2}>
                Tenant:{" "}
              </Form.Label>
              <Col sm={10}>
                <TenantPickerField name="tenant_id" />
                <ErrorMessage
                  name="tenant_id"
                  component="div"
                  className="text-danger"
                />
              </Col>
            </FormGroup>
            <FormGroup as={Row} className="align-items-center">
              <Form.Label column sm={2}>
                Notification Type:{" "}
              </Form.Label>
              <Col sm={10}>
                <Field
                  as="select"
                  name="notificationType"
                  className="form-select"
                  style={{ width: "225px" }}
                >
                  <option value="GIVEN">Given</option>
                  <option value="CANCEL">Cancel</option>
                  <option value="NEW_BAG">New Bag</option>
                </Field>

                <ErrorMessage
                  name="notificationType"
                  component="div"
                  className="text-danger"
                />
              </Col>
            </FormGroup>
            {values.notificationType === "NEW_BAG" && (
              <FormGroup as={Row} className="align-items-center">
                <Col sm={{ span: 10, offset: 2 }}>
                  <Form.Check
                    type="checkbox"
                    label="Is Edit"
                    checked={values.isEdit}
                    onChange={(e) => setFieldValue("isEdit", e.target.checked)}
                  />
                </Col>
              </FormGroup>
            )}
            <FormGroup as={Row} className="align-items-center">
              <Form.Label column sm={2}>
                PMRN:{" "}
              </Form.Label>
              <Col sm={4}>
                <Field type="text" name="pmrn" placeholder="PMRN" />
                <ErrorMessage
                  name="pmrn"
                  component="div"
                  className="text-danger"
                />
              </Col>
            </FormGroup>
            <FormGroup as={Row} className="align-items-center">
              <Form.Label column sm={2}>
                Medication Order ID:{" "}
              </Form.Label>
              <Col sm={4}>
                <Field
                  type="text"
                  name="medicationOrderId"
                  placeholder={values.medicationOrderId}
                />
                <ErrorMessage
                  name="medicationOrderId"
                  component="div"
                  className="text-danger"
                />
              </Col>
            </FormGroup>
            <FormGroup as={Row} className="align-items-center">
              <Form.Label column sm={2}>
                Medication ID:{" "}
              </Form.Label>
              <Col sm={4}>
                <Field
                  type="text"
                  name="clientMedicationId"
                  placeholder={values.clientMedicationId}
                />
                <ErrorMessage
                  name="clientMedicationId"
                  component="div"
                  className="text-danger"
                />
              </Col>
            </FormGroup>
            <FormGroup as={Row} className="align-items-center">
              <Form.Label column sm={2}>
                Administration Date:{" "}
              </Form.Label>
              <Col sm={4}>
                <DatePickerField
                  name="administrationDate"
                  showTimeSelect
                  selected={values.administrationDate}
                  dateFormat="MM/dd/yyyy h:mm a"
                  timeIntervals={1}
                />
              </Col>
            </FormGroup>
            <FormGroup as={Row} className="align-items-center">
              <Form.Label column sm={2}>
                Encounter CSN:{" "}
              </Form.Label>
              <Col sm={4}>
                <Field
                  type="text"
                  name="encounterCSN"
                  placeholder={values.encounterCSN}
                />
                <ErrorMessage
                  name="encounterCSN"
                  component="div"
                  className="text-danger"
                />
              </Col>
            </FormGroup>
            <Button
              className="me-3"
              type="submit"
              onClick={() => setFieldValue("sendNotification", true)}
              disabled={isSubmitting || !isValid}
            >
              Send Notification
            </Button>
            <Button
              type="submit"
              onClick={() => setFieldValue("sendNotification", false)}
              disabled={isSubmitting || !isValid}
            >
              Generate Notification
            </Button>

            <Row>
              <Col>
                Generated Payload:
                <pre style={{ maxHeight: "400px" }}>
                  {values.generatedPayload}
                </pre>
              </Col>
            </Row>
          </Form>
        )}
      </Formik>
    </>
  );
}

export function MedicationAdministrationNotificationForm() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main">
        <MedicationAdministrationNotificationFormContent />
      </main>
    </Container>
  );
}
