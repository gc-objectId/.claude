import { Button, Form } from "react-bootstrap";
import {
  ErrorMessage,
  Field,
  Formik,
  FormikErrors,
  FormikHelpers,
} from "formik";
import {
  TenantPickerFormikField,
  useTenantOptions,
} from "../../../components/Admin/TenantPicker";
import { useAuth } from "../../../context/AuthContext";
import { isLoggedIn } from "../../../types/User";
import { SimulationController } from "../../../api/generated/sdk.gen";
import { PatientID, TenantID } from "../../../types/identifiers";
import { DatePickerField } from "../../../components/Form/DatePickerField";
import { SimulateMedAdminNotificationDto } from "../../../api/generated/types.gen";
import { useAdminPanelContext } from "../../../context/AdminPanelContext";

interface FormValues {
  tenant_id: string;
  username: string;
  pmrn: string;
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

const EXAMPLE_TENANT = "mgb-mgh" as TenantID;
const NOTIFICATION_TENANTS = [
  "mgb-mgh",
  "mgb-icsnh",
  "demo-demo",
  "demo-qa",
] as TenantID[];

function validate(values: FormValues): FormikErrors<FormValues> {
  const errors: FormikErrors<FormValues> = {};
  if (!values.tenant_id) {
    errors.tenant_id = "Tenant ID is required";
  }
  if (!values.clientMedicationId) {
    errors.clientMedicationId = "Client Medication ID is required";
  }
  if (!values.medicationOrderId) {
    errors.medicationOrderId = "Medication Order ID is required";
  }
  if (!values.pmrn.trim()) {
    errors.pmrn = "PMRN is required";
  }
  return errors;
}

type NotificationModeProps = {
  patientId: PatientID | "";
  onPatientIdChange: (value: PatientID | "") => void;
};

export function NotificationMode({
  patientId,
  onPatientIdChange,
}: NotificationModeProps) {
  const { tenantId: ctxTenantId } = useAdminPanelContext();
  const auth = useAuth();
  const currentUser = isLoggedIn(auth.user) ? auth.user.name : "";
  const startTenant = ctxTenantId ?? EXAMPLE_TENANT;
  const startTenantOffered = useTenantOptions(NOTIFICATION_TENANTS).some(
    (option) => option.value === startTenant,
  );

  const defaultTime = new Date();
  defaultTime.setSeconds(0, 0);
  const initialValues: FormValues = {
    tenant_id: startTenantOffered ? startTenant : "",
    username: currentUser,
    pmrn: patientId,
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
        pmrn: values.pmrn.trim() || undefined,
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
    <Formik
      initialValues={initialValues}
      initialErrors={validate(initialValues)}
      validate={validate}
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
          <div className="admin-filters">
            <Form.Group className="admin-field" controlId="username">
              <Form.Label className="guided-eyebrow">User</Form.Label>
              <Field type="text" name="username" className="form-control" />
              <ErrorMessage
                name="username"
                component="div"
                className="text-danger"
              />
            </Form.Group>
            <Form.Group className="admin-field" controlId="tenant_id">
              <Form.Label className="guided-eyebrow">Tenant</Form.Label>
              <TenantPickerFormikField
                name="tenant_id"
                id="tenant_id"
                only={NOTIFICATION_TENANTS}
              />
              <ErrorMessage
                name="tenant_id"
                component="div"
                className="text-danger"
              />
            </Form.Group>
            <Form.Group className="admin-field" controlId="notificationType">
              <Form.Label className="guided-eyebrow">
                Notification Type
              </Form.Label>
              <Field
                as="select"
                name="notificationType"
                className="form-select"
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
            </Form.Group>
            {values.notificationType === "NEW_BAG" && (
              <Form.Group className="admin-field" controlId="isEdit">
                <Form.Check
                  type="checkbox"
                  label="Is Edit"
                  checked={values.isEdit}
                  onChange={(e) => setFieldValue("isEdit", e.target.checked)}
                />
              </Form.Group>
            )}
            <Form.Group className="admin-field" controlId="pmrn">
              <Form.Label className="guided-eyebrow">PMRN</Form.Label>
              <Field
                type="text"
                name="pmrn"
                className="form-control"
                placeholder="PMRN"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFieldValue("pmrn", e.target.value);
                  onPatientIdChange(e.target.value as PatientID);
                }}
              />
              <ErrorMessage
                name="pmrn"
                component="div"
                className="text-danger"
              />
            </Form.Group>
            <Form.Group className="admin-field" controlId="medicationOrderId">
              <Form.Label className="guided-eyebrow">
                Medication Order ID
              </Form.Label>
              <Field
                type="text"
                name="medicationOrderId"
                className="form-control"
                placeholder={values.medicationOrderId}
              />
              <ErrorMessage
                name="medicationOrderId"
                component="div"
                className="text-danger"
              />
            </Form.Group>
            <Form.Group className="admin-field" controlId="clientMedicationId">
              <Form.Label className="guided-eyebrow">Medication ID</Form.Label>
              <Field
                type="text"
                name="clientMedicationId"
                className="form-control"
                placeholder={values.clientMedicationId}
              />
              <ErrorMessage
                name="clientMedicationId"
                component="div"
                className="text-danger"
              />
            </Form.Group>
            <Form.Group className="admin-field" controlId="administrationDate">
              <Form.Label className="guided-eyebrow">
                Administration Date
              </Form.Label>
              <DatePickerField
                name="administrationDate"
                className="form-control"
                showTimeSelect
                selected={values.administrationDate}
                dateFormat="MM/dd/yyyy h:mm a"
                timeIntervals={1}
              />
            </Form.Group>
            <Form.Group className="admin-field" controlId="encounterCSN">
              <Form.Label className="guided-eyebrow">Encounter CSN</Form.Label>
              <Field
                type="text"
                name="encounterCSN"
                className="form-control"
                placeholder={values.encounterCSN}
              />
              <ErrorMessage
                name="encounterCSN"
                component="div"
                className="text-danger"
              />
            </Form.Group>
            <div className="admin-filters__actions">
              <Button
                variant="outline-primary"
                type="submit"
                onClick={() => setFieldValue("sendNotification", false)}
                disabled={isSubmitting || !isValid}
              >
                Generate Notification
              </Button>
              <Button
                type="submit"
                onClick={() => setFieldValue("sendNotification", true)}
                disabled={isSubmitting || !isValid}
              >
                Send Notification
              </Button>
            </div>
          </div>
          <div className="admin-detail">
            <p className="guided-eyebrow mb-0">Generated Payload</p>
            <pre className="admin-pre admin-pre--scrolling mt-2">
              {values.generatedPayload}
            </pre>
          </div>
        </Form>
      )}
    </Formik>
  );
}
