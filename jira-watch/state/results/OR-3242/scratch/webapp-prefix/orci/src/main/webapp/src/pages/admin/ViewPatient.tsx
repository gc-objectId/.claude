import "../../App.scss";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { AdminTable } from "../../components/Admin/AdminTable";
import { Fact, FactList } from "../../components/Admin/FactList";
import { SectionHeader } from "../../components/SectionHeader";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Form as BootstrapForm,
  Row,
  Spinner,
} from "react-bootstrap";

import { isLoaded, Loadable, loading } from "../../types/Loadable";
import { PatientUUID, TenantID } from "../../types/identifiers";
import { Link, useParams } from "react-router-dom";
import { formatGender } from "../../utils/formatting";
import Modal from "react-bootstrap/Modal";
import { ErrorMessage, Form, Formik, FormikHelpers } from "formik";
import { DatePickerField } from "../../components/Form/DatePickerField";
import { DateTime } from "luxon";
import React from "react";
import { deriveTenantId } from "../../utils/tenant";
import { DataController, PatientController, ProcedureTypeDto } from "@api";
import type { OperationDto, PatientDto } from "@api";

import { logger } from "../../utils/logger";
const search = window.location.search;
const tenantId = deriveTenantId() as TenantID;

function ViewPatient() {
  const { id } = useParams();

  const [patient, setPatient] = useState<Loadable<PatientDto>>(loading());
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    getPatient();
  }, []);

  const getPatient = async function () {
    logger.debug("getting patient");
    const { data, error } = await PatientController.getPatient({
      path: { patientId: id as PatientUUID },
    });
    if (data) {
      setPatient(data);
    } else {
      logger.debug("Error getting patient: ", error);
      setLoadFailed(true);
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        trail={[
          {
            label: "Patients",
            to: `/admin/patients?client_id=${tenantId}`,
          },
        ]}
        title={isLoaded(patient) ? patient.fullName : "Patient"}
      />
      {isLoaded(patient) ? (
        <>
          <section className="admin-section">
            <FactList>
              <Fact label="PMRN" wide>
                {patient.pmrn}
              </Fact>
              <Fact label="MRN" wide>
                {patient.mrn}
              </Fact>
              <Fact label="DOB">
                {patient.dob || "—"}
                {patient.age ? ` (${patient.age} y.o.)` : ""}
              </Fact>
              <Fact label="Gender">
                {patient.gender ? formatGender(patient.gender) : "—"}
              </Fact>
              {patient.genderIdentity && (
                <Fact label="Gender Identity">
                  {formatGender(patient.genderIdentity)}
                </Fact>
              )}
              <Fact label="Height">{patient.height}</Fact>
              <Fact label="Weight">{patient.weight}</Fact>
              {patient.birthHeight && (
                <Fact label="Birth Height">{patient.birthHeight}</Fact>
              )}
              {patient.birthWeight && (
                <Fact label="Birth Weight">{patient.birthWeight}</Fact>
              )}
              {patient.gestationalAgeAtBirth && (
                <Fact label="Gestational Age At Birth">
                  {patient.gestationalAgeAtBirth}
                </Fact>
              )}
            </FactList>
          </section>

          <OperationListing patient={patient} />
        </>
      ) : loadFailed ? (
        <div className="admin-empty text-danger">
          Unable to load this patient.
        </div>
      ) : (
        <Spinner />
      )}
    </AdminPage>
  );
}

interface CreateOperationFormProps {
  onHide: () => void;
  onSave: (operation: OperationDto) => void;
  patient: PatientDto;
  procedureTypes: ProcedureTypeDto[];
}

interface CreateOperationFormValues {
  caseId: string;
  startTime: Date;
  procedureTypes: string[];
  qualifiers: Record<string, string>;
}

const CreateOperationForm = ({
  onHide,
  onSave,
  patient,
  procedureTypes,
}: CreateOperationFormProps) => {
  const initialValues: CreateOperationFormValues = {
    caseId: "",
    startTime: new Date(),
    procedureTypes: [],
    qualifiers: {},
  };

  const validate = (values: CreateOperationFormValues) => {
    const errors: Partial<CreateOperationFormValues> = {};

    return errors;
  };

  const handleSubmit = async (
    values: CreateOperationFormValues,
    { setSubmitting }: FormikHelpers<CreateOperationFormValues>,
  ) => {
    logger.debug("Create operation", values);
    const { data, error } = await PatientController.createOperation({
      path: { patientId: patient.id },
      body: {
        startTime: values.startTime.toISOString(),
        procedureTypes: values.procedureTypes.map((id) => ({
          id,
          qualifier: values.qualifiers[id] || undefined,
        })),
      },
      headers: { "X-Tenant-Id": tenantId },
    }).finally(() => {
      setSubmitting(false);
      onHide();
    });
    if (data) {
      logger.debug("Operation created: ", data);
      onSave(data);
    } else {
      logger.debug("Error creating operation: ", error);
      alert("Error: " + error);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validate={validate}
      onSubmit={handleSubmit}
    >
      {({ setFieldValue, handleBlur, values }) => {
        const selectedProcedureTypes = procedureTypes.filter(
          (pt) =>
            pt.procedureId && values.procedureTypes.includes(pt.procedureId),
        );
        const procedureTypesWithQualifiers = selectedProcedureTypes.filter(
          (pt) => pt.availableQualifiers && pt.availableQualifiers.length > 0,
        );

        return (
          <Form>
            <Row className="mb-3">
              <Col>
                <BootstrapForm.Group controlId="startTime">
                  <BootstrapForm.Label>Start Time</BootstrapForm.Label>
                  <DatePickerField
                    name="startTime"
                    className="form-control"
                    showTimeSelect
                    dateFormat="MM/dd/yyyy h:mm a"
                    timeIntervals={15}
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <BootstrapForm.Group controlId="procedureTypes">
                  <BootstrapForm.Label>Procedure Types</BootstrapForm.Label>
                  <BootstrapForm.Select
                    name="procedureType"
                    multiple
                    value={values.procedureTypes}
                    onChange={(event) => {
                      let select =
                        event.currentTarget as unknown as HTMLSelectElement;
                      const selectedValues = Array.from(
                        select.selectedOptions,
                        (option) => option.value,
                      );
                      // Clear qualifiers for deselected procedure types
                      const newQualifiers = { ...values.qualifiers };
                      Object.keys(newQualifiers).forEach((id) => {
                        if (!selectedValues.includes(id)) {
                          delete newQualifiers[id];
                        }
                      });
                      setFieldValue("procedureTypes", selectedValues);
                      setFieldValue("qualifiers", newQualifiers);
                    }}
                    onBlur={handleBlur}
                  >
                    {procedureTypes.map((procedureType) => {
                      return (
                        <option
                          key={procedureType.procedureId}
                          value={procedureType.procedureId}
                        >
                          {procedureType.procedureName} (
                          {procedureType.procedureId})
                        </option>
                      );
                    })}
                  </BootstrapForm.Select>
                  <ErrorMessage
                    name="procedureTypes"
                    component="div"
                    className="text-danger"
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            {procedureTypesWithQualifiers.map((pt) => (
              <Row className="mb-3" key={pt.procedureId}>
                <Col>
                  <BootstrapForm.Group
                    controlId={`qualifier-${pt.procedureId}`}
                  >
                    <BootstrapForm.Label>
                      Qualifier for {pt.procedureName}
                    </BootstrapForm.Label>
                    <BootstrapForm.Select
                      value={values.qualifiers[pt.procedureId!] ?? ""}
                      onChange={(event) => {
                        setFieldValue("qualifiers", {
                          ...values.qualifiers,
                          [pt.procedureId!]: event.currentTarget.value,
                        });
                      }}
                    >
                      <option value="">-- None --</option>
                      {pt.availableQualifiers!.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </BootstrapForm.Select>
                  </BootstrapForm.Group>
                </Col>
              </Row>
            ))}

            <div className="d-flex justify-content-end">
              <Button type="submit">Add Operation</Button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};

function OperationListing({ patient }: { patient: PatientDto }) {
  const [operations, setOperations] = useState<OperationDto[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureTypeDto[]>([]);

  const [showCreateOperationModel, setShowCreateOperationModel] =
    useState(false);
  const [lastOperationCreated, setLastOperationCreated] =
    useState<OperationDto | null>(null);
  const clearLastOperationTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const getProcedureTypes = async () => {
    const response = await DataController.getProcedureTypes();
    if (response.data) {
      setProcedureTypes(response.data);
    } else if (response.error) {
      logger.debug("Error getting procedure types: ", response.error);
      alert("Error: " + response.error);
    }
  };

  useEffect(() => {
    getOperations();
    getProcedureTypes();
  }, []);
  const getOperations = async function () {
    const { data, error } = await PatientController.getOperations({
      path: { patientId: patient.id },
    });
    if (data) {
      setOperations(data);
    } else {
      logger.debug("Error getting operations: ", error);
      alert("Error: " + error);
    }
  };

  function handleAddOperation() {
    // create a modal with a form for adding an operation
    setShowCreateOperationModel(true);
  }

  function onHide() {
    setShowCreateOperationModel(false);
  }

  function onSave(operation: OperationDto) {
    setOperations([operation, ...operations]);
    setLastOperationCreated(operation);
    onHide();
  }

  useEffect(() => {
    // Clear any existing timeout before setting a new one
    if (clearLastOperationTimeoutRef.current !== null) {
      clearTimeout(clearLastOperationTimeoutRef.current);
    }

    if (lastOperationCreated !== null) {
      clearLastOperationTimeoutRef.current = setTimeout(() => {
        setLastOperationCreated(null);
        clearLastOperationTimeoutRef.current = null;
      }, 3000);
    }

    return () => {
      if (clearLastOperationTimeoutRef.current !== null) {
        clearTimeout(clearLastOperationTimeoutRef.current);
        clearLastOperationTimeoutRef.current = null;
      }
    };
  }, [lastOperationCreated]);

  return (
    <section className="admin-section">
      <SectionHeader
        title="Operations"
        actions={
          <Button size="sm" onClick={handleAddOperation}>
            Add Operation
          </Button>
        }
      />

      <Modal show={showCreateOperationModel} onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>Add Operation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            <CreateOperationForm
              onHide={onHide}
              onSave={onSave}
              patient={patient}
              procedureTypes={procedureTypes}
            />
          </div>
        </Modal.Body>
      </Modal>
      {lastOperationCreated && (
        <Alert variant="success">
          Operation {lastOperationCreated.caseId} created successfully
        </Alert>
      )}
      <AdminTable>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Start</th>
            <th>End</th>
            <th>Procedures</th>
            <th>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {operations.length === 0 && (
            <tr>
              <td colSpan={5} className="admin-table__empty">
                No operations on file.
              </td>
            </tr>
          )}
          {operations.map((operation) => {
            const caseParams = `patient_id=${patient.pmrn}&case_id=${operation.caseId}&client_id=${tenantId}`;

            return (
              <tr key={operation.caseId}>
                <td>{operation.caseId}</td>
                <td>
                  {operation.startTime &&
                    DateTime.fromISO(operation.startTime).toLocaleString(
                      DateTime.DATETIME_SHORT_WITH_SECONDS,
                    )}
                </td>
                <td>
                  {operation.endTime &&
                    DateTime.fromISO(operation.endTime).toLocaleString(
                      DateTime.DATETIME_SHORT_WITH_SECONDS,
                    )}
                </td>
                <td>
                  {operation.procedureTypes
                    .map((type) =>
                      type.qualifier
                        ? `${type.procedureName} (${type.qualifier})`
                        : type.procedureName,
                    )
                    .join(", ")}
                </td>
                <td>
                  <div className="admin-table__actions">
                    <a
                      className="btn btn-primary btn-sm"
                      href={`/app-launch?${caseParams}`}
                    >
                      Launch
                    </a>
                    <Link
                      className="btn btn-secondary btn-sm"
                      to={`/admin/patients/${patient.id}/operations/${operation.operationId}/debugger?client_id=${tenantId}`}
                      title="Open the debugger without starting the case"
                    >
                      View Operation
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </AdminTable>
    </section>
  );
}

export default ViewPatient;
