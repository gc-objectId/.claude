import "../../App.scss";
import { useEffect, useState } from "react";
import { Button, Col, Container, Form, Row } from "react-bootstrap";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { CaseID, PatientID } from "../../types/identifiers";
import { useAdminPanelContext } from "../../context/AdminPanelContext";

import { logger } from "../../utils/logger";
export function MedicationAdministrationsSimulationContent() {
  const { patientId: ctxPatientId, caseId: ctxCaseId } = useAdminPanelContext();
  const [patientId, setPatientId] = useState<PatientID | "">(
    ctxPatientId ?? "",
  );
  const [caseId, setCaseId] = useState<CaseID | "">(ctxCaseId ?? "");
  const [pattern, setPattern] = useState("");
  const [category, setCategory] = useState("");
  const [useEncounterId, setUseEncounterId] = useState(false);

  useEffect(() => {}, []);

  const handleSubmit = () => {
    const url = `/api/simulation/${patientId}/${caseId}/simulate-med-admins?pattern=${encodeURIComponent(
      pattern,
    )}&category=${encodeURIComponent(
      category,
    )}&useEncounterId=${useEncounterId}`;
    logger.debug(
      "patient-id: ",
      patientId,
      " case-id: ",
      caseId,
      " pattern: ",
      pattern,
      " category: ",
      category,
      " url: ",
      url,
    );
    window.open(url);
  };
  return (
    <>
      <h1>Simulation</h1>

      <h2>Medication Administrations</h2>

      <Form>
        <Container>
          <Form.Group className="mt-3 mb-3" controlId="patientId">
            <Form.Label className="fw-bold me-3">PMRN:</Form.Label>
            <Form.Control
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
              style={{ width: "200px", display: "inline-block" }}
              type="text"
              placeholder=""
              className="me-1"
              onChange={(e) => setCaseId(e.target.value as CaseID)}
              value={caseId}
            />
          </Form.Group>
          <Form.Group className="mt-3" controlId="pattern">
            <Form.Label className="fw-bold me-3">Pattern:</Form.Label>
            <Form.Control
              style={{ width: "200px", display: "inline-block" }}
              type="text"
              placeholder="[A-Z].*"
              className="me-1"
              onChange={(e) => setPattern(e.target.value)}
              value={pattern}
            />
          </Form.Group>
          <Form.Group className="mt-3" controlId="category">
            <Form.Label className="fw-bold me-3">Category:</Form.Label>
            <Form.Control
              style={{ width: "200px", display: "inline-block" }}
              type="text"
              placeholder="LOCAL_ANESTHETIC"
              className="me-1"
              onChange={(e) => setCategory(e.target.value)}
              value={category}
            />
          </Form.Group>
          <Form.Group className="mt-3" controlId="useEncounterId">
            <Form.Check
              type="checkbox"
              id="useEncounterId"
              label="Use Encounter Id"
              checked={useEncounterId}
              onChange={(e) => setUseEncounterId(e.target.checked)}
            />
          </Form.Group>
          <Row className="mt-3">
            <Col md={{ span: 4, offset: 4 }}>
              <Button onClick={handleSubmit}>Submit</Button>
            </Col>
          </Row>
        </Container>
      </Form>
    </>
  );
}

function MedicationAdministrationsSimulation() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main">
        <MedicationAdministrationsSimulationContent />
      </main>
      <Footer />
    </Container>
  );
}

export default MedicationAdministrationsSimulation;
