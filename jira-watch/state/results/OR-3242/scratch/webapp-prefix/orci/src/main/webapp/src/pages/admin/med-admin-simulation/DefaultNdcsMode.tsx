import { ChangeEvent, useMemo, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { CaseFields, CaseFieldsProps, hasCase } from "./CaseFields";

export function DefaultNdcsMode(caseFields: CaseFieldsProps) {
  const { patientId, caseId } = caseFields;
  const [file, setFile] = useState<File | null>(null);
  const url = useMemo(
    () =>
      `/api/simulation/${patientId.trim()}/${caseId.trim()}/simulate-med-admin-default-ndcs`,
    [patientId, caseId],
  );

  return (
    <Form
      target="_blank"
      action={url}
      method="POST"
      encType="multipart/form-data"
    >
      <div className="admin-filters">
        <CaseFields {...caseFields} />
        <Form.Group className="admin-field admin-field--wide" controlId="file">
          <Form.Label className="guided-eyebrow">
            File{" "}
            <a href="/samples/sample-med-admin-default-ndcs.csv">
              (sample input)
            </a>
          </Form.Label>
          <Form.Control
            name="file"
            type="file"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFile(e.target.files?.[0] ?? null)
            }
          />
        </Form.Group>
        <div className="admin-filters__actions">
          <Button type="submit" disabled={!file || !hasCase(caseFields)}>
            Submit
          </Button>
        </div>
      </div>
    </Form>
  );
}
