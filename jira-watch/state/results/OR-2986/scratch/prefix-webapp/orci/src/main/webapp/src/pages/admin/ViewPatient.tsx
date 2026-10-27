import "../../App.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Container,
  Form as BootstrapForm,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { isLoaded, Loadable, loading } from "../../types/Loadable";
import { PatientUUID, TenantID } from "../../types/identifiers";
import { Link, useParams } from "react-router-dom";
import { formatGender } from "../../utils/formatting";
import Modal from "react-bootstrap/Modal";
import { ErrorMessage, Form, Formik, FormikHelpers } from "formik";
import DatePicker from "react-datepicker";
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
      alert("Error: " + error);
    }
  };

  return (
    <Container fluid="md">
      <Header />
      <main role="main">
        <div className="mb-2">
          <small>
            <Link to={`/admin/patients?client_id=${tenantId}`}>Patients</Link>{" "}
            &gt; View Patient
          </small>
        </div>
        {isLoaded(patient) ? (
          <>
            <h1>{patient.fullName}</h1>
            <div>
              <Row>
                <Col>PMRN: {patient.pmrn}</Col>
              </Row>
              <Row>
                <Col>MRN: {patient.mrn}</Col>
              </Row>
              <Row>
                <Col>
                  DOB: {patient.dob}{" "}
                  {patient.age ? "(" + patient.age + " y.o.)" : ""}
                </Col>
              </Row>
              <Row>
                <Col>
                  Gender: {patient.gender && formatGender(patient.gender)}
                </Col>
              </Row>
              {patient.genderIdentity && (
                <Row>
                  <Col>
                    Gender Identity:{" "}
                    {patient.genderIdentity &&
                      formatGender(patient.genderIdentity)}
                  </Col>
                </Row>
              )}
              <Row>
                <Col>Height: {patient.height}</Col>
              </Row>
              <Row>
                <Col>Weight: {patient.weight}</Col>
              </Row>
              {patient.birthHeight && (
                <Row>
                  <Col>Birth Height: {patient.birthHeight}</Col>
                </Row>
              )}
              {patient.birthWeight && (
                <Row>
                  <Col>Birth Weight: {patient.birthWeight}</Col>
                </Row>
              )}
              {patient.gestationalAgeAtBirth && (
                <Row>
                  <Col>
                    Gestational Age At Birth: {patient.gestationalAgeAtBirth}
                  </Col>
                </Row>
              )}
            </div>

            <OperationListing patient={patient} />
          </>
        ) : (
          <Spinner />
        )}
      </main>
      <Footer />
    </Container>
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
                  <BootstrapForm.Label className={"me-2"}>
                    Start Time:{" "}
                  </BootstrapForm.Label>
                  <DatePicker
                    showTimeSelect
                    onChange={(date) => setFieldValue("startTime", date)}
                    selected={values.startTime}
                    dateFormat="MM/dd/yyyy h:mm a"
                    timeIntervals={15}
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <BootstrapForm.Group controlId="procedureTypes">
                  <BootstrapForm.Label className={"me-2"}>
                    Procedure Types:{" "}
                  </BootstrapForm.Label>
                  <BootstrapForm.Control
                    as="select"
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
                  </BootstrapForm.Control>
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
                    <BootstrapForm.Label className={"me-2"}>
                      Qualifier for {pt.procedureName}:{" "}
                    </BootstrapForm.Label>
                    <BootstrapForm.Control
                      as="select"
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
                    </BootstrapForm.Control>
                  </BootstrapForm.Group>
                </Col>
              </Row>
            ))}

            <Button type="submit">Submit</Button>
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
    <div>
      <h3>Operations</h3>
      <Row>
        <Col className="d-flex justify-content-end">
          <Button className="mb-3" onClick={handleAddOperation}>
            Add Operation
          </Button>
        </Col>
      </Row>

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
        <Alert variant="success" className="small">
          Operation {lastOperationCreated.caseId} created successfully
        </Alert>
      )}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Start</th>
            <th>End</th>
            <th>Type</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
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
                  <a
                    className={"btn-primary btn me-2"}
                    href={`/app-launch?${caseParams}`}
                  >
                    Launch
                  </a>
                  <Link
                    className={"btn-secondary btn"}
                    to={`/admin/patients/${patient.id}/operations/${operation.operationId}/debugger?client_id=${tenantId}`}
                    title="Open the debugger without starting the case"
                  >
                    View Operation
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

export default ViewPatient;
