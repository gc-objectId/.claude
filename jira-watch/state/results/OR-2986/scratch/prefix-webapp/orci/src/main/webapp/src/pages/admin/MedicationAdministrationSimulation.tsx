import "../../App.scss";
import { useEffect, useMemo, useState } from "react";
import { Button, Col, Container, Form, Row } from "react-bootstrap";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { CaseID, PatientID, TenantID, UserID } from "../../types/identifiers";
import { $request } from "../../utils/request";
import { Array } from "runtypes";
import type { MedicationOptionDto } from "@api";
import { MedicationsController } from "@api";
import { APIUnknownError } from "../../errors/APIError";
import { MedicationFormProps } from "../../components/MedicationForm";
import { MedicationRoute } from "../../types/MedicationRoute";
import { useAdminPanelContext } from "../../context/AdminPanelContext";

import { logger } from "../../utils/logger";
export function MedicationAdministrationSimulationContent() {
  const { patientId: ctxPatientId, caseId: ctxCaseId } = useAdminPanelContext();
  const [patientId, setPatientId] = useState<PatientID | "">(
    ctxPatientId ?? "",
  );
  const [caseId, setCaseId] = useState<CaseID | "">(ctxCaseId ?? "");
  const [medications, setMedications] = useState<MedicationOptionDto[]>([]);
  const [ndc, setNDC] = useState("");
  const [doseAmount, setDoseAmount] = useState("");
  const [doseUnits, setDoseUnits] = useState("");
  const [route, setRoute] = useState("");
  const [useEncounterId, setUseEncounterId] = useState(false);
  const url = useMemo(
    () =>
      `/api/simulation/${patientId.trim()}/${caseId.trim()}/simulate-med-admin`,
    [patientId, caseId],
  );
  const routeOptions: MedicationRoute[] = [
    "ENDOTRACHEAL",
    "EPIDURAL",
    "GASTROSTOMY_TUBE",
    "INFILTRATION",
    "INHALATION",
    "INJECTION",
    "INTRAMUSCULAR",
    "INTRANASAL",
    "INTRAOCULAR",
    "INTRAOSSEOUS",
    "INTRASPINAL",
    "INTRATHECAL",
    "INTRAVENOUS",
    "NASAL",
    "NEBULIZATION",
    "NERVE_BLOCK",
    "ORAL",
    "RECTAL",
    "SPINAL",
    "SUBCUTANEOUS",
    "SUBLINGUAL",
    "TOPICAL",
    "TRANSDERMAL",
    "TRANSLINGUAL",
    "UNKNOWN",
  ];

  const getMedications = async function () {
    logger.debug("getting medications");
    const { data } = await MedicationsController.getMedications();
    if (data) {
      setMedications(data);
    }
  };

  useEffect(() => {
    getMedications();
  }, []);

  return (
    <>
      <h1>Simulation</h1>

      <h2>Medication Administration</h2>

      <Form target="_blank" action={url} method="POST">
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
          <Form.Group className="mt-3" controlId="medication">
            <Form.Label className="fw-bold me-3">Medication:</Form.Label>
            <Form.Select
              name="medicationIdentifier"
              style={{ width: "600px", display: "inline-block" }}
            >
              <option />
              {medications.map((medication) => {
                return (
                  <option
                    key={medication.medicationIdentifier}
                    value={medication.medicationIdentifier}
                  >
                    {medication.medicationName}
                  </option>
                );
              })}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mt-3" controlId="NDC">
            <Form.Label className="fw-bold me-3">NDCs:</Form.Label>
            <Form.Control
              name="ndc"
              style={{ width: "200px", display: "inline-block" }}
              type="text"
              placeholder=""
              className="me-1"
              onChange={(e) => setNDC(e.target.value)}
              value={ndc}
            />
          </Form.Group>
          <Form.Group className="mt-3" controlId="doseAmount">
            <Form.Label className="fw-bold me-3">Dose Amount:</Form.Label>
            <Form.Control
              name="doseAmount"
              style={{ width: "200px", display: "inline-block" }}
              type="text"
              placeholder="100"
              className="me-1"
              onChange={(e) => setDoseAmount(e.target.value)}
              value={doseAmount}
            />
          </Form.Group>
          <Form.Group className="mt-3" controlId="doseUnits">
            <Form.Label className="fw-bold me-3">Dose Units:</Form.Label>
            <Form.Control
              name="doseUnits"
              style={{ width: "200px", display: "inline-block" }}
              type="text"
              placeholder="mg"
              className="me-1"
              onChange={(e) => setDoseUnits(e.target.value)}
              value={doseUnits}
            />
          </Form.Group>
          <Form.Group className="mt-3" controlId="route">
            <Form.Label className="fw-bold me-3">Route:</Form.Label>
            <Form.Select
              name="route"
              style={{ width: "200px", display: "inline-block" }}
              className="me-1"
              onChange={(e) => setRoute(e.target.value)}
              value={route}
            >
              <option />
              {routeOptions.map((routeOption) => {
                return (
                  <option key={routeOption} value={routeOption}>
                    {routeOption}
                  </option>
                );
              })}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mt-3" controlId="useEncounterId">
            <Form.Check
              name="useEncounterId"
              type="checkbox"
              id="useEncounterId"
              label="Use Encounter Id"
              checked={useEncounterId}
              onChange={(e) => setUseEncounterId(e.target.checked)}
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

function MedicationAdministrationSimulation() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main">
        <MedicationAdministrationSimulationContent />
      </main>
      <Footer />
    </Container>
  );
}

export default MedicationAdministrationSimulation;
