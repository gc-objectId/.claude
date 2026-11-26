import { useEffect, useMemo, useState } from "react";
import { Button, Form } from "react-bootstrap";
import type { MedicationOptionDto } from "@api";
import { SimulationController } from "@api";
import { MedicationRoute } from "../../../types/MedicationRoute";
import { CaseFields, CaseFieldsProps, hasCase } from "./CaseFields";

const ROUTE_OPTIONS: MedicationRoute[] = [
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

type Medications =
  | { state: "loading" }
  | { state: "loaded"; medications: MedicationOptionDto[] }
  | { state: "failed" };

export function SingleMode(caseFields: CaseFieldsProps) {
  const { patientId, caseId } = caseFields;
  const [medications, setMedications] = useState<Medications>({
    state: "loading",
  });
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

  useEffect(() => {
    SimulationController.getSimulationMedications()
      .then(({ data }) =>
        setMedications(
          data ? { state: "loaded", medications: data } : { state: "failed" },
        ),
      )
      .catch(() => setMedications({ state: "failed" }));
  }, []);

  return (
    <Form target="_blank" action={url} method="POST">
      <div className="admin-filters">
        <CaseFields {...caseFields} />
        <Form.Group
          className="admin-field admin-field--wide"
          controlId="medication"
        >
          <Form.Label className="guided-eyebrow">Medication</Form.Label>
          {medications.state === "failed" ? (
            <span className="text-danger">Medications could not be loaded</span>
          ) : (
            <Form.Select name="medicationIdentifier">
              <option />
              {medications.state === "loaded" &&
                medications.medications.map((medication) => (
                  <option
                    key={medication.medicationIdentifier}
                    value={medication.medicationIdentifier}
                  >
                    {medication.medicationName}
                  </option>
                ))}
            </Form.Select>
          )}
        </Form.Group>
        <Form.Group className="admin-field" controlId="NDC">
          <Form.Label className="guided-eyebrow">NDCs</Form.Label>
          <Form.Control
            name="ndc"
            type="text"
            onChange={(e) => setNDC(e.target.value)}
            value={ndc}
          />
        </Form.Group>
        <Form.Group className="admin-field" controlId="doseAmount">
          <Form.Label className="guided-eyebrow">Dose Amount</Form.Label>
          <Form.Control
            name="doseAmount"
            type="text"
            placeholder="100"
            onChange={(e) => setDoseAmount(e.target.value)}
            value={doseAmount}
          />
        </Form.Group>
        <Form.Group className="admin-field" controlId="doseUnits">
          <Form.Label className="guided-eyebrow">Dose Units</Form.Label>
          <Form.Control
            name="doseUnits"
            type="text"
            placeholder="mg"
            onChange={(e) => setDoseUnits(e.target.value)}
            value={doseUnits}
          />
        </Form.Group>
        <Form.Group className="admin-field" controlId="route">
          <Form.Label className="guided-eyebrow">Route</Form.Label>
          <Form.Select
            name="route"
            onChange={(e) => setRoute(e.target.value)}
            value={route}
          >
            <option />
            {ROUTE_OPTIONS.map((routeOption) => (
              <option key={routeOption} value={routeOption}>
                {routeOption}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="admin-field" controlId="useEncounterId">
          <Form.Check
            name="useEncounterId"
            type="checkbox"
            label="Use Encounter Id"
            checked={useEncounterId}
            onChange={(e) => setUseEncounterId(e.target.checked)}
          />
        </Form.Group>
        <div className="admin-filters__actions">
          <Button type="submit" disabled={!hasCase(caseFields)}>
            Submit
          </Button>
        </div>
      </div>
    </Form>
  );
}
