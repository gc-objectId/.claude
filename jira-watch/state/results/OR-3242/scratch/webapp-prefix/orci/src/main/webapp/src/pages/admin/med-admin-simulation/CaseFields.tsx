import { Form } from "react-bootstrap";
import { CaseID, PatientID } from "../../../types/identifiers";

export type CaseFieldsProps = {
  patientId: PatientID | "";
  caseId: CaseID | "";
  onPatientIdChange: (value: PatientID | "") => void;
  onCaseIdChange: (value: CaseID | "") => void;
};

export function hasCase({
  patientId,
  caseId,
}: Pick<CaseFieldsProps, "patientId" | "caseId">): boolean {
  return patientId.trim() !== "" && caseId.trim() !== "";
}

export function CaseFields({
  patientId,
  caseId,
  onPatientIdChange,
  onCaseIdChange,
}: CaseFieldsProps) {
  return (
    <>
      <Form.Group className="admin-field" controlId="patientId">
        <Form.Label className="guided-eyebrow">PMRN</Form.Label>
        <Form.Control
          name="patientId"
          type="text"
          onChange={(e) => onPatientIdChange(e.target.value as PatientID)}
          value={patientId}
        />
      </Form.Group>
      <Form.Group className="admin-field" controlId="caseId">
        <Form.Label className="guided-eyebrow">Case ID</Form.Label>
        <Form.Control
          name="caseId"
          type="text"
          onChange={(e) => onCaseIdChange(e.target.value as CaseID)}
          value={caseId}
        />
      </Form.Group>
    </>
  );
}
