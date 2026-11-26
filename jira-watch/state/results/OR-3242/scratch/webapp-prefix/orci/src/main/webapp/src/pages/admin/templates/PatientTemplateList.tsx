import "../../../App.scss";
import { AdminPage, AdminPageHeader } from "../../../components/AdminPage";
import { AdminTable } from "../../../components/Admin/AdminTable";
import React, { useEffect, useState } from "react";
import {
  Button,
  Col,
  Form as BootstrapForm,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import { ErrorMessage, Field, Form, Formik, FormikHelpers } from "formik";
import { DateTime } from "luxon";
import "react-datepicker/dist/react-datepicker.css";

import { isLoaded, Loadable, loading } from "../../../types/Loadable";
import { PatientTemplate } from "../../../types/PatientTemplate";
import { Gender, GenderOptions } from "../../../types/Gender";
import { formatGender } from "../../../utils/formatting";
import { Patient } from "../../../types/Patient";
import { TenantID } from "../../../types/identifiers";
import { deriveTenantId } from "../../../utils/tenant";
import { DatePickerField } from "../../../components/Form/DatePickerField";
import { PatientTemplateController } from "@api";
import { useNavigate } from "react-router-dom";

import { logger } from "../../../utils/logger";
function PatientTemplateList() {
  const [patientTemplates, setPatientTemplates] = useState<
    Loadable<PatientTemplate[]>
  >(loading());
  const [showModal, setShowModal] = useState(false);
  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  useEffect(() => {
    getPatientTemplates();
  }, []);

  const getPatientTemplates = async function () {
    logger.debug("getting patient templates");
    const response = await PatientTemplateController.getTemplates();
    if (response.data) {
      setPatientTemplates(response.data as PatientTemplate[]);
    } else if (response.error) {
      logger.debug("Error getting templates: ", response.error);
      alert("Error: " + response.error);
    }
  };

  const handleSave = () => {
    getPatientTemplates().then(() => {
      handleCloseModal();
    });
  };

  const handleTemplateChange = () => {
    getPatientTemplates();
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Patient Templates"
        actions={
          <Button onClick={handleShowModal}>Create New Patient Template</Button>
        }
      />

      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Patient Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <PatientTemplateForm onHide={handleCloseModal} onSave={handleSave} />
        </Modal.Body>
      </Modal>

      {isLoaded(patientTemplates) ? (
        <PatientTemplateTable
          templates={patientTemplates}
          onTemplateChange={handleTemplateChange}
        />
      ) : (
        <Spinner />
      )}
    </AdminPage>
  );
}

interface PatientTemplateFormValues {
  templateName: string;
  dob: Date | null;
  height: string;
  weight: string;
  gender: Gender | "";
  genderIdentity: Gender | "";
}

interface PatientTemplateFormProps {
  onHide: () => void;
  onSave: () => void;
  template?: PatientTemplate | null;
  mode?: "create" | "edit";
}

interface CreatePatientFormValues {
  firstName: string;
  lastName: string;
}

interface CreatePatientFormProps {
  onHide: () => void;
  onSave: (patient: Patient) => void;
  template: PatientTemplate;
}

const PatientTemplateForm = ({
  onHide,
  onSave,
  template = null,
  mode = "create",
}: PatientTemplateFormProps) => {
  const initialValues: PatientTemplateFormValues = template
    ? {
        templateName: template.templateName,
        dob: template.dob ? new Date(template.dob) : null,
        height: template.height?.value?.toString() || "",
        weight: template.weight?.value?.toString() || "",
        gender: template.gender || "",
        genderIdentity: template.genderIdentity || "",
      }
    : {
        templateName: "",
        dob: null,
        height: "",
        weight: "",
        gender: "",
        genderIdentity: "",
      };

  const validate = (values: PatientTemplateFormValues) => {
    const errors: Partial<PatientTemplateFormValues> = {};
    if (!values.templateName) {
      errors.templateName = "Template Name is required";
    }
    if (values.height && isNaN(Number(values.height))) {
      errors.height = "Height must be a number";
    }
    if (values.weight && isNaN(Number(values.weight))) {
      errors.weight = "Weight must be a number";
    }
    return errors;
  };

  const handleSubmit = async (
    values: PatientTemplateFormValues,
    { setSubmitting }: FormikHelpers<PatientTemplateFormValues>,
  ) => {
    let templateData = {
      id: template?.id || undefined,
      templateName: values.templateName,

      height: {
        value: parseFloat(values.height),
        units: "cm",
      },
      weight: {
        value: parseFloat(values.weight),
        units: "kg",
      },
      gender: values.gender == "" ? "UNKNOWN" : values.gender,
      genderIdentity:
        values.genderIdentity == "" ? "UNKNOWN" : values.genderIdentity,
      dob: values.dob == null ? undefined : values.dob.toISOString(),
    };

    try {
      let response =
        mode === "edit" && template?.id
          ? await PatientTemplateController.updateTemplate({
              path: { id: template.id },
              body: templateData,
            })
          : await PatientTemplateController.createTemplate({
              body: templateData,
            });

      if (response.data) {
        logger.debug(`Template ${mode}d:`, response.data);
        onSave();
      } else if (response.error) {
        logger.debug(`Error ${mode}ing template:`, response.error);
        alert("Error: " + response.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validate={validate}
      onSubmit={handleSubmit}
    >
      {({ setFieldValue, values }) => (
        <Form>
          <Row className="mb-3">
            <Col>
              <BootstrapForm.Group controlId="templateName">
                <BootstrapForm.Label>Template Name*</BootstrapForm.Label>
                <Field name="templateName" as={BootstrapForm.Control} />
                <ErrorMessage
                  name="templateName"
                  component="div"
                  className="text-danger"
                />
              </BootstrapForm.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col>
              <BootstrapForm.Group controlId="dob">
                <BootstrapForm.Label>Date of Birth</BootstrapForm.Label>
                <DatePickerField name="dob" className="form-control" />
              </BootstrapForm.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col>
              <BootstrapForm.Group controlId="height">
                <BootstrapForm.Label>Height (cm)</BootstrapForm.Label>
                <Field name="height" type="number" as={BootstrapForm.Control} />
                <ErrorMessage
                  name="height"
                  component="div"
                  className="text-danger"
                />
              </BootstrapForm.Group>
            </Col>
            <Col>
              <BootstrapForm.Group controlId="weight">
                <BootstrapForm.Label>Weight (kg)</BootstrapForm.Label>
                <Field name="weight" type="number" as={BootstrapForm.Control} />
                <ErrorMessage
                  name="weight"
                  component="div"
                  className="text-danger"
                />
              </BootstrapForm.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col>
              <BootstrapForm.Group controlId="gender">
                <BootstrapForm.Label>Gender</BootstrapForm.Label>
                <Field name="gender" as={BootstrapForm.Select}>
                  <option value="">Select Gender</option>

                  {GenderOptions.map((option) => {
                    return (
                      <option key={option} value={option}>
                        {formatGender(option)}
                      </option>
                    );
                  })}
                </Field>
              </BootstrapForm.Group>
            </Col>
            <Col>
              <BootstrapForm.Group controlId="genderIdentity">
                <BootstrapForm.Label>Gender Identity</BootstrapForm.Label>
                <Field name="genderIdentity" as={BootstrapForm.Select}>
                  <option value="">Select Gender Identity</option>
                  {GenderOptions.map((option) => {
                    return (
                      <option key={option} value={option}>
                        {formatGender(option)}
                      </option>
                    );
                  })}
                </Field>
              </BootstrapForm.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-end">
            <Button type="submit">
              {mode === "edit" ? "Update Template" : "Create Template"}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

const CreatePatientForm = ({
  onHide,
  onSave,
  template,
}: CreatePatientFormProps) => {
  const initialValues: CreatePatientFormValues = {
    firstName: "",
    lastName: "",
  };

  const validate = (values: CreatePatientFormValues) => {
    const errors: Partial<CreatePatientFormValues> = {};

    return errors;
  };

  const handleSubmit = async (
    values: CreatePatientFormValues,
    { setSubmitting }: FormikHelpers<CreatePatientFormValues>,
  ) => {
    try {
      const response =
        await PatientTemplateController.createPatientFromTemplate({
          body: {
            templateId: template.id!,
            firstName: values.firstName,
            lastName: values.lastName,
          },
        });

      if (response.data) {
        logger.debug("Patient created: ", response.data);
        onSave(response.data as Patient);
      } else if (response.error) {
        logger.debug("Error creating patient: ", response.error);
        alert("Error: " + response.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validate={validate}
      onSubmit={handleSubmit}
    >
      {({ setFieldValue, values }) => (
        <Form>
          <Row className="mb-3">
            <Col>
              <BootstrapForm.Group controlId="firstName">
                <BootstrapForm.Label>First Name</BootstrapForm.Label>
                <Field
                  name="firstName"
                  type="text"
                  as={BootstrapForm.Control}
                />
                <ErrorMessage
                  name="firstName"
                  component="div"
                  className="text-danger"
                />
              </BootstrapForm.Group>
            </Col>
            <Col>
              <BootstrapForm.Group controlId="lastName">
                <BootstrapForm.Label>Last Name</BootstrapForm.Label>
                <Field name="lastName" type="text" as={BootstrapForm.Control} />
                <ErrorMessage
                  name="lastName"
                  component="div"
                  className="text-danger"
                />
              </BootstrapForm.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end">
            <Button type="submit">Create Patient</Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

function PatientTemplateTable({
  templates,
  onTemplateChange,
}: {
  templates: PatientTemplate[];
  onTemplateChange: () => void;
}) {
  const navigate = useNavigate();
  const [showCreatePatientModal, setShowCreatePatientModal] = useState(false);
  const [selectedPatientTemplate, setSelectedPatientTemplate] =
    useState<PatientTemplate | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<PatientTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    template: PatientTemplate | null;
  }>({ show: false, template: null });

  const handleShowModal = (template: PatientTemplate) => {
    setSelectedPatientTemplate(template);
    setShowCreatePatientModal(true);
  };
  const handleCloseModal = () => setShowCreatePatientModal(false);

  const handleSave = (patient: Patient) => {
    handleCloseModal();
    navigate(`/admin/patients/${patient.id}?client_id=${tenantId}`);
  };

  const handleEdit = (template: PatientTemplate) => {
    setEditingTemplate(template);
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    setShowEditModal(false);
    setEditingTemplate(null);
    onTemplateChange();
  };

  const handleDeleteClick = (template: PatientTemplate) => {
    setDeleteConfirm({ show: true, template });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.template?.id) return;

    const response = await PatientTemplateController.deleteTemplate({
      path: { id: deleteConfirm.template.id },
    });

    if (response.data !== undefined) {
      logger.debug("Template deleted successfully");
      onTemplateChange();
      setDeleteConfirm({ show: false, template: null });
    } else if (response.error) {
      logger.debug("Error deleting template:", response.error);
      alert("Error deleting template: " + response.error);
    }
  };

  const tenantId = deriveTenantId() as TenantID;

  return (
    <div>
      <AdminTable>
        <thead>
          <tr>
            <th>Template</th>
            <th>Date of Birth</th>
            <th>Height</th>
            <th>Weight</th>
            <th>Gender</th>
            <th>Gender Identity</th>
            <th>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {templates.length === 0 && (
            <tr>
              <td colSpan={7} className="admin-table__empty">
                No patient templates yet.
              </td>
            </tr>
          )}
          {templates.map((template) => (
            <tr key={template.id}>
              <td>
                {template.templateName}
                <span className="admin-table__secondary">{template.id}</span>
              </td>
              <td>{formatTemplateDate(template.dob)}</td>
              <td>{formatMeasure(template.height)}</td>
              <td>{formatMeasure(template.weight)}</td>
              <td>{template.gender ? formatGender(template.gender) : "—"}</td>
              <td>
                {template.genderIdentity
                  ? formatGender(template.genderIdentity)
                  : "—"}
              </td>
              <td>
                <div className="admin-table__actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      handleShowModal(template);
                    }}
                  >
                    Create Patient
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteClick(template)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
      <Modal
        show={showCreatePatientModal && selectedPatientTemplate != null}
        onHide={handleCloseModal}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Patient</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-secondary">
            Create a patient from{" "}
            <strong>{selectedPatientTemplate?.templateName}</strong>.
          </p>
          <CreatePatientForm
            template={selectedPatientTemplate!}
            onHide={handleCloseModal}
            onSave={handleSave}
          />
        </Modal.Body>
      </Modal>

      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Patient Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <PatientTemplateForm
            template={editingTemplate}
            mode="edit"
            onHide={() => setShowEditModal(false)}
            onSave={handleEditSave}
          />
        </Modal.Body>
      </Modal>

      <Modal
        show={deleteConfirm.show}
        onHide={() => setDeleteConfirm({ show: false, template: null })}
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteConfirm.template && (
            <p>
              Are you sure you want to delete the template{" "}
              <strong>{deleteConfirm.template.templateName}</strong>?
            </p>
          )}
          <p className="text-danger">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setDeleteConfirm({ show: false, template: null })}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Delete Template
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

function formatTemplateDate(iso: string | null): string {
  return iso ? DateTime.fromISO(iso).toLocaleString(DateTime.DATE_SHORT) : "—";
}

function formatMeasure(
  measure: PatientTemplate["height"] | PatientTemplate["weight"],
): string {
  return measure?.value != null ? `${measure.value} ${measure.units}` : "—";
}

export default PatientTemplateList;
