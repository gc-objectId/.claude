import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Button, Container, Form, Modal } from "react-bootstrap";
import { CaseID, PatientID } from "../../../../types/identifiers";
import { AllergenTypeEnum } from "../../../../types/AllergenType";
import {
  AllergenDto,
  AllergensController,
  AllergyDto,
  AllergyReaction,
  AllergyReactionsController,
  PatientController,
} from "@api";

export type AddAllergyProps = {
  patientId: PatientID;
  caseId: CaseID;
  show: boolean;
  handleSave: (allergen: AllergyDto) => void;
  handleCancel: () => void;
};

export type AllergenSelection = {
  identifier: string;
  type: NonNullable<AllergenDto["type"]>;
};

type InputMode = "ALLERGEN" | "RXNORM" | "SNOMED";

export function AddAllergy({
  patientId,
  caseId,
  show,
  handleSave,
  handleCancel,
}: AddAllergyProps) {
  const [allergens, setAllergens] = useState<AllergenDto[]>([]);
  const [reactions, setReactions] = useState<AllergyReaction[]>([]);
  const [allergen, setAllergen] = useState<AllergenSelection>();
  const [reaction, setReaction] = useState<string>();
  const [inputMode, setInputMode] = useState<InputMode>("ALLERGEN");
  const [code, setCode] = useState<string>("");
  const [saveEnabled, setSaveEnabled] = useState<boolean>(false);

  useEffect(() => {
    getAllergens();
    getReactions();
  }, []);

  useEffect(() => {
    const enabled = Boolean(
      reaction && (inputMode === "ALLERGEN" ? allergen : code),
    );
    setSaveEnabled(enabled);
  }, [reaction, allergen, inputMode, code]);

  const getAllergens = useCallback(async () => {
    const response = await AllergensController.getAllergens();
    if (response.data) {
      setAllergens(response.data);
    } else {
      console.error("getAllergens: ", response.error);
    }
  }, []);

  const getReactions = useCallback(async () => {
    const response = await AllergyReactionsController.getReactions({});
    if (response.data) {
      setReactions(response.data);
    } else {
      console.error("getAllergyReactions: ", response.error);
    }
  }, []);

  const handleFormSave = useCallback(async () => {
    if (reaction && (inputMode === "ALLERGEN" ? allergen : code)) {
      setSaveEnabled(false);
      const response = await PatientController.addAllergy({
        path: {
          patientId,
        },
        query:
          inputMode === "ALLERGEN"
            ? {
                identifier: allergen!.identifier,
                caseId: caseId,
                type: allergen!.type,
                reaction,
              }
            : {
                identifier: code,
                caseId: caseId,
                type: inputMode,
                reaction,
              },
      });
      if (response.data) {
        handleSave(response.data);
      }
      setSaveEnabled(true);
    }
  }, [allergen, reaction, inputMode, code, patientId, caseId, handleSave]);

  const handleAllergenSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      // assume identifier is unique across allergens and medications
      const selectedAllergen = allergens.find(
        (a) => a.identifier === e.target.value,
      );
      if (
        selectedAllergen &&
        selectedAllergen.identifier &&
        selectedAllergen.type
      ) {
        setAllergen({
          identifier: selectedAllergen.identifier,
          type: selectedAllergen.type,
        });
      }
    },
    [allergens],
  );

  const handleReactionSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setReaction(e.target.value);
    },
    [],
  );

  return (
    <Modal show={show} onHide={handleCancel} keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Add Allergy</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container fluid="md">
          <Form>
            <Form.Group className="mt-3 mb-3" controlId="inputMode">
              <Form.Check
                type="radio"
                name="inputMode"
                label="Select allergen"
                checked={inputMode === "ALLERGEN"}
                onChange={() => setInputMode("ALLERGEN")}
              />
              <Form.Check
                type="radio"
                name="inputMode"
                label="Add by RxNorm code"
                checked={inputMode === "RXNORM"}
                onChange={() => setInputMode("RXNORM")}
              />
              <Form.Check
                type="radio"
                name="inputMode"
                label="Add by SNOMED code"
                checked={inputMode === "SNOMED"}
                onChange={() => setInputMode("SNOMED")}
              />
            </Form.Group>
            {inputMode !== "ALLERGEN" ? (
              <Form.Group className="mt-3 mb-3" controlId="code">
                <Form.Label className="fw-bold me-3">
                  {inputMode === "RXNORM" ? "RxNorm code: " : "SNOMED code: "}
                </Form.Label>
                <Form.Control
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </Form.Group>
            ) : (
              <Form.Group className="mt-3 mb-3" controlId="allergen">
                <Form.Label className="fw-bold me-3">Allergen: </Form.Label>
                <Form.Select
                  aria-label="Select"
                  onChange={handleAllergenSelect}
                >
                  <option></option>
                  {allergens?.map((allergen) => {
                    var label =
                      allergen.type == AllergenTypeEnum.MEDICATION
                        ? allergen.allergen + " (medication)"
                        : allergen.allergen;
                    return (
                      <option key={allergen.id} value={allergen.identifier}>
                        {label}
                      </option>
                    );
                  })}
                </Form.Select>
              </Form.Group>
            )}
            <Form.Group className="mt-3 mb-3" controlId="reaction">
              <Form.Label className="fw-bold me-3">Reaction: </Form.Label>
              <Form.Select aria-label="Select" onChange={handleReactionSelect}>
                <option></option>
                {reactions?.map((reaction) => (
                  <option key={reaction.reaction} value={reaction.reaction}>
                    {reaction.reaction}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          onClick={handleFormSave}
          disabled={!saveEnabled}
        >
          Save
        </Button>
        <Button variant="secondary" onClick={handleCancel}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
