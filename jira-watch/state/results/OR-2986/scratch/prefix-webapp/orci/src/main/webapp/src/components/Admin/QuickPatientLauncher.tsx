import { Button, Card, Col, Form, FormGroup, Row } from "react-bootstrap";
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

import { logger } from "../../utils/logger";
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
    <Card>
      <Card.Header>Launch Case</Card.Header>
      <Card.Body>
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
          onSubmit={async ({ tenantID, patientID, caseID }, actions) => {
            if (tenantID === "demo-demo") {
              window.location.href = `/app-launch?patient_id=${patientID}&case_id=${caseID}&client_id=${tenantID}`;
            } else if (tenantID.startsWith("mgb-")) {
              // TODO we hard code an encounter id but it isn't strictly required for the launch to work (it's a hold over from legacy usage)
              window.location.href = `/app-launch?patient_id=${patientID}&case_id=${caseID}&client_id=${tenantID}&user_id=${
                user.clientUserId ?? ""
              }&encounter_id=2000976997&EpicSourceAuth=YAvBBHA4owsdOnKoeMFoQ5pWbSHzewiqnfl7Dze76%2FE%3D&EpicSourceClient=VzIC%2Bd8QZ1F%2FCY5DjY9tjoy0Z3D4GHC7s2seCWhBMaM%3D&EpicSourceSeq=rLEv9A3p`;
            } else {
              logger.debug("Unable to launch for tenant: ", tenantID);
            }
            actions.setSubmitting(false);
          }}
        >
          {({ handleSubmit, isValid, values, errors }) => (
            <Form onSubmit={handleSubmit}>
              <FormGroup as={Row} className="align-items-center mb-3">
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
              <FormGroup as={Row} className="align-items-center mb-3">
                <Form.Label column sm={2}>
                  Patient ID:{" "}
                </Form.Label>
                <Col sm={10}>
                  <BootstrapField name="patientID" />
                  <ErrorMessage
                    name="patientID"
                    component="div"
                    className="text-danger"
                  />
                </Col>
              </FormGroup>
              <FormGroup as={Row} className="align-items-center mb-3">
                <Form.Label column sm={2}>
                  Case ID:{" "}
                </Form.Label>
                <Col sm={10}>
                  <CaseIDPicker
                    name="caseID"
                    tenant={values.tenantID}
                    pmrn={values.patientID as PatientID}
                  />
                  <ErrorMessage
                    name="caseID"
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
      </Card.Body>
    </Card>
  );
}

function CaseIDPicker({
  tenant,
  pmrn,
  name,
}: {
  tenant: string;
  pmrn: PatientID;
  name: string;
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
      isClearable
      options={caseOptions}
      placeholder="Select or type a case ID..."
      onChange={(option) => {
        helper.setValue(option?.value ?? "");
      }}
      value={
        caseOptions.find((o) => o.value === field.value) || {
          label: field.value,
          value: field.value,
        }
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
