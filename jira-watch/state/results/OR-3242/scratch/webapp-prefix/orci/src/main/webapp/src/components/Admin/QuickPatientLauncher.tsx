import { Button, Form } from "react-bootstrap";
import React, { useMemo } from "react";
import type { OperationDto } from "@api";
import { useQuery } from "@tanstack/react-query";
import CreatableSelect from "react-select/creatable";
import { getOperationsByPmrnOptions } from "@api/@tanstack/react-query.gen";
import { ErrorMessage, Formik, useField } from "formik";
import { TenantPickerFormikField } from "./TenantPicker";
import { PatientID } from "../../types/identifiers";
import { useAuth } from "../../context/AuthContext";
import { isLoggedIn } from "../../types/User";
import { BootstrapField } from "../Form/BootstrapField";
import { guidedSelectTheme } from "../Form/guidedSelect";

type CaseOption = { value: string; label: string };

interface FormValues {
  tenantID: string;
  patientID: string;
  caseID: string;
}

export function QuickPatientLauncher() {
  const auth = useAuth();
  const user = auth.user;

  if (!isLoggedIn(user)) {
    return null;
  }

  return (
    <div className="quick-launcher">
      <Formik
        initialValues={{
          tenantID: "",
          patientID: "",
          caseID: "",
        }}
        validate={(values) => {
          const errors: Partial<FormValues> = {};
          if (!values.tenantID) {
            errors.tenantID = "Tenant ID is required";
          }
          if (!values.patientID) {
            errors.patientID = "Patient ID is required";
          }
          if (!values.caseID) {
            errors.caseID = "Case ID is required";
          }
          return errors;
        }}
        onSubmit={({ tenantID, patientID, caseID }) => {
          const launch = new URLSearchParams({
            patient_id: patientID,
            case_id: caseID,
            client_id: tenantID,
          });
          window.location.href = `/app-launch?${launch}`;
        }}
      >
        {({ handleSubmit, isValid, values }) => (
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="quick-launcher-tenant" className="mb-3">
              <Form.Label className="guided-eyebrow">Tenant</Form.Label>
              <TenantPickerFormikField
                name="tenantID"
                id="quick-launcher-tenant"
              />
              <ErrorMessage
                name="tenantID"
                component="div"
                className="text-danger small"
              />
            </Form.Group>
            <Form.Group controlId="quick-launcher-patient" className="mb-3">
              <Form.Label className="guided-eyebrow">Patient ID</Form.Label>
              <BootstrapField name="patientID" />
              <ErrorMessage
                name="patientID"
                component="div"
                className="text-danger small"
              />
            </Form.Group>
            <Form.Group controlId="quick-launcher-case" className="mb-3">
              <Form.Label className="guided-eyebrow">Case ID</Form.Label>
              <CaseIDPicker
                name="caseID"
                inputId="quick-launcher-case"
                tenant={values.tenantID}
                pmrn={values.patientID as PatientID}
              />
              <ErrorMessage
                name="caseID"
                component="div"
                className="text-danger small"
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button type="submit" disabled={!isValid}>
                Launch
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}

function CaseIDPicker({
  tenant,
  pmrn,
  name,
  inputId,
}: {
  tenant: string;
  pmrn: PatientID;
  name: string;
  inputId: string;
}) {
  const auth = useAuth();
  const user = auth.user;

  const [field, meta, helper] = useField(name);

  const { data: operations } = useQuery({
    ...getOperationsByPmrnOptions({
      path: { pmrn: pmrn! },
      headers: {
        "X-Tenant-Id": tenant,
      },
    }),
    enabled: isLoggedIn(user) && !!pmrn && !!tenant,
  });

  const caseOptions = useMemo(
    () => (operations ?? []).map(formatCaseOption),
    [operations],
  );

  if (!isLoggedIn(user)) {
    return null;
  }
  return (
    <CreatableSelect<CaseOption>
      inputId={inputId}
      theme={guidedSelectTheme}
      isClearable
      options={caseOptions}
      placeholder="Select or type a case ID..."
      onChange={(option) => {
        helper.setValue(option?.value ?? "");
      }}
      value={
        field.value
          ? caseOptions.find((o) => o.value === field.value) || {
              label: field.value,
              value: field.value,
            }
          : null
      }
      onBlur={(e) => {
        field.onBlur(e);
        helper.setTouched(true);
      }}
      formatCreateLabel={(input) => `Use "${input}"`}
    />
  );
}

function formatCaseOption(op: OperationDto): CaseOption {
  const parts = [op.caseId];
  if (op.startTime) {
    parts.push(new Date(op.startTime).toLocaleDateString());
  }
  return { value: op.caseId!, label: parts.join(" — ") };
}
