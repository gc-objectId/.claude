import "../../App.scss";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button, Col, Container, Form, Row } from "react-bootstrap";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { CaseID, PatientID, TenantID, UserID } from "../../types/identifiers";
import { useAdminPanelContext } from "../../context/AdminPanelContext";

export function MedicationAdministrationDefaultNDCsSimulationContent() {
  const { patientId: ctxPatientId, caseId: ctxCaseId } = useAdminPanelContext();
  const [patientId, setPatientId] = useState<PatientID | "">(
    ctxPatientId ?? "",
  );
  const [caseId, setCaseId] = useState<CaseID | "">(ctxCaseId ?? "");
  const [file, setFile] = useState<File | "">("");

  const url = useMemo(
    () =>
      `/api/simulation/${patientId.trim()}/${caseId.trim()}/simulate-med-admin-default-ndcs`,
    [patientId, caseId],
  );

  useEffect(() => {}, []);

  return (
    <>
      <h1>Simulation</h1>

      <h2>Medication Administrations (Default NDCs)</h2>

      <Form
        target="_blank"
        action={url}
        method="POST"
        encType="multipart/form-data"
      >
        <Form.Control type="hidden" value="mgb-mgh" />
        <Container>
          <Form.Group className="mt-3 mb-3" controlId="patientId">
            <Form.Label className="fw-bold me-3">PMRN:</Form.Label>
            <Form.Control
              name="patientId"
              style={{ width: "200px", display: "inline-block" }}
              type="text"
              placeholder=""
              className="me-1"
              onChange={(e) => setPatientId(e.target.value as PatientID)}
              value={patientId}
            />
          </Form.Group>
          <Form.Group className="mt-3" controlId="caseId">
            <Form.Label className="fw-bold me-3">Case ID:</Form.Label>
            <Form.Control
              name="caseId"
              style={{ width: "200px", display: "inline-block" }}
              type="text"
              placeholder=""
              className="me-1"
              onChange={(e) => setCaseId(e.target.value as CaseID)}
              value={caseId}
            />
          </Form.Group>
          <Form.Group className="mt-3" controlId="file">
            <Form.Label className="fw-bold me-3">
              File:{" "}
              <small className={"fw-normal"}>
                (
                <a href={"/samples/sample-med-admin-default-ndcs.csv"}>
                  sample input
                </a>
                )
              </small>
            </Form.Label>

            <Form.Control
              name="file"
              style={{ width: "500px", display: "inline-block" }}
              type="file"
              className="me-1"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (e.target.files && e.target.files.length > 0) {
                  setFile(e.target.files[0]);
                }
              }}
            />
          </Form.Group>
          <Row className="mt-3">
            <Col md={{ span: 4, offset: 4 }}>
              <Button type="submit">Submit</Button>
            </Col>
          </Row>
        </Container>
      </Form>
    </>
  );
}

function MedicationAdministrationDefaultNDCsSimulation() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main">
        <MedicationAdministrationDefaultNDCsSimulationContent />
      </main>
      <Footer />
    </Container>
  );
}

export default MedicationAdministrationDefaultNDCsSimulation;
