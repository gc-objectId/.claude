import React, { useEffect, useState } from "react";
import {
  Button,
  Col,
  Container,
  Form,
  FormGroup,
  Modal,
  Row,
} from "react-bootstrap";
import { CaseID, PatientID } from "../../../../types/identifiers";

import {
  ObservationTypeEnum,
  ObservationTypeOptions,
} from "../../../../types/ObservationType";
import { ErrorMessage, Formik, FormikErrors } from "formik";
import { DatePickerField } from "../../../Form/DatePickerField";
import Select from "react-select";
import { BootstrapField } from "../../../Form/BootstrapField";
import { ObservationController, ObservationDto } from "@api";

import { logger } from "../../../../utils/logger";
type Option = {
  value: string;
  label: string;
};

export type AddObservationProps = {
  patientId: PatientID;
  caseId: CaseID;
  show: boolean;
  handleSave: () => void;
  handleCancel: () => void;
};

export const ObservationDefaultUnits = {
  [ObservationTypeEnum.EGFR]: "mL/min/[1.73]*m^2",
  [ObservationTypeEnum.GLUCOSE]: "mg/dL",
  [ObservationTypeEnum.EBL]: "mL",
  [ObservationTypeEnum.QTC_INTERVAL]: "ms",
};

export function AddObservation({
  patientId,
  caseId,
  show,
  handleSave,
  handleCancel,
}: AddObservationProps) {
  useEffect(() => {
    const options = ObservationTypeOptions.map((option) => {
      return {
        value: option,
        label: option,
      };
    });
    setObservationTypeOptions(options);
  }, []);

  const [observationTypeOptions, setObservationTypeOptions] = useState<
    Option[]
  >([]);

  interface AddObservationFormValues {
    effectiveDate: Date;
    observationType: ObservationDto["type"] | "";
    observationValue: string;
    observationUnits: string;
  }

  return (
    <Modal show={show} onHide={handleCancel} keyboard={false} size={"lg"}>
      <Modal.Header closeButton>
        <Modal.Title>Add Observation</Modal.Title>
      </Modal.Header>
      <Formik
        initialValues={
          {
            effectiveDate: new Date(),
            observationType: "",
            observationValue: "",
            observationUnits: "",
          } as AddObservationFormValues
        }
        initialErrors={{
          effectiveDate: "required",
          observationType: "required",
          observationValue: "required",
          observationUnits: "required",
        }}
        validate={(values) => {
          const errors: FormikErrors<typeof values> = {};
          if (!values.effectiveDate) {
            errors.effectiveDate = "Effective date is required";
          }
          if (!values.observationType) {
            errors.observationType = "Observation type is required";
          }
          if (!values.observationValue) {
            errors.observationValue = "Observation value is required";
          }
          if (!values.observationUnits) {
            errors.observationUnits = "Observation units is required";
          }
          return errors;
        }}
        onSubmit={(values) => {
          logger.debug("Submitting: ", values);
          ObservationController.addObservation({
            path: {
              patientId,
              caseId,
            },
            body: {
              date: values.effectiveDate.toISOString(),
              value: values.observationValue,
              units: values.observationUnits,
              type: values.observationType as ObservationDto["type"],
            },
          }).then(handleSave);
        }}
      >
        {({ isValid, submitForm, handleReset, setFieldValue, values }) => (
          <>
            <Modal.Body>
              <Container fluid="lg">
                <Form onSubmit={submitForm} onReset={handleReset}>
                  <FormGroup as={Row} className="align-items-center mb-2">
                    <Form.Label column sm={3}>
                      Effective Date:{" "}
                    </Form.Label>
                    <Col sm={9}>
                      <DatePickerField
                        name="effectiveDate"
                        showTimeSelect
                        selected={values.effectiveDate}
                        dateFormat="MM/dd/yyyy h:mm a"
                        timeIntervals={1}
                      />
                      <ErrorMessage
                        name="effectiveDate"
                        component="div"
                        className="text-danger"
                      />
                    </Col>
                  </FormGroup>

                  <FormGroup as={Row} className="align-items-center mb-2">
                    <Form.Label column sm={3}>
                      Observation Type:{" "}
                    </Form.Label>
                    <Col sm={9}>
                      <Select
                        name="observationType"
                        options={observationTypeOptions}
                        onChange={(newValue) => {
                          setFieldValue("observationType", newValue?.value);
                          setFieldValue(
                            "observationUnits",
                            (newValue?.value &&
                              ObservationDefaultUnits[newValue?.value]) ||
                              "",
                          );
                        }}
                      />
                      <ErrorMessage
                        name="start"
                        component="div"
                        className="text-danger"
                      />
                    </Col>
                  </FormGroup>
                  <FormGroup as={Row} className="align-items-center mb-2">
                    <Form.Label column sm={3}>
                      Observation Value:{" "}
                    </Form.Label>
                    <Col sm={9}>
                      <BootstrapField name="observationValue" />
                      <ErrorMessage
                        name="observationValue"
                        component="div"
                        className="text-danger"
                      />
                    </Col>
                  </FormGroup>
                  <FormGroup as={Row} className="align-items-center mb-2">
                    <Form.Label column sm={3}>
                      Observation Units:{" "}
                    </Form.Label>

                    <Col sm={9}>
                      <BootstrapField name="observationUnits" />
                      <ErrorMessage
                        name="observationUnits"
                        component="div"
                        className="text-danger"
                      />
                    </Col>
                  </FormGroup>
                </Form>
              </Container>
            </Modal.Body>
            <Modal.Footer>
              <Button type="submit" disabled={!isValid} onClick={submitForm}>
                Submit
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                Close
              </Button>
            </Modal.Footer>
          </>
        )}
      </Formik>
    </Modal>
  );
}
