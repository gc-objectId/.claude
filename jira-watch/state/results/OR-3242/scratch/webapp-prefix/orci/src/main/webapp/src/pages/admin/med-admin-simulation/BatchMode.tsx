import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { CaseFields, CaseFieldsProps, hasCase } from "./CaseFields";

export function BatchMode(caseFields: CaseFieldsProps) {
  const { patientId, caseId } = caseFields;
  const [pattern, setPattern] = useState("");
  const [category, setCategory] = useState("");
  const [useEncounterId, setUseEncounterId] = useState(false);

  const handleSubmit = () => {
    const url = `/api/simulation/${patientId.trim()}/${caseId.trim()}/simulate-med-admins?pattern=${encodeURIComponent(
      pattern,
    )}&category=${encodeURIComponent(
      category,
    )}&useEncounterId=${useEncounterId}`;
    window.open(url);
  };

  return (
    <Form>
      <div className="admin-filters">
        <CaseFields {...caseFields} />
        <Form.Group className="admin-field" controlId="pattern">
          <Form.Label className="guided-eyebrow">Pattern</Form.Label>
          <Form.Control
            type="text"
            placeholder="[A-Z].*"
            onChange={(e) => setPattern(e.target.value)}
            value={pattern}
          />
        </Form.Group>
        <Form.Group className="admin-field" controlId="category">
          <Form.Label className="guided-eyebrow">Category</Form.Label>
          <Form.Control
            type="text"
            placeholder="LOCAL_ANESTHETIC"
            onChange={(e) => setCategory(e.target.value)}
            value={category}
          />
        </Form.Group>
        <Form.Group className="admin-field" controlId="useEncounterId">
          <Form.Check
            type="checkbox"
            label="Use Encounter Id"
            checked={useEncounterId}
            onChange={(e) => setUseEncounterId(e.target.checked)}
          />
        </Form.Group>
        <div className="admin-filters__actions">
          <Button onClick={handleSubmit} disabled={!hasCase(caseFields)}>
            Submit
          </Button>
        </div>
      </div>
    </Form>
  );
}
