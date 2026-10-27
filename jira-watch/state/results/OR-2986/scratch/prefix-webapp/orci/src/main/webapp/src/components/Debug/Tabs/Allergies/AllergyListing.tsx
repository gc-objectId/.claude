import { Button, Spinner, Table } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import React, { useCallback, useEffect, useState } from "react";
import { AllergenName, CaseID, PatientID } from "../../../../types/identifiers";
import { useAuth } from "../../../../context/AuthContext";
import { isLoaded } from "../../../../types/Loadable";
import { CopyableIdentifier } from "../../CopyableIdentifier";
import {
  AllergyDto,
  AllergySuppressionSettingDto,
  PatientAllergiesDto,
  PatientController,
  RuleSettingsController,
} from "@api";

export type AllergyListingProps = {
  patientId: PatientID;
  caseId: CaseID;
  allergies: PatientAllergiesDto[];
  onRemove(allergy: AllergyDto): void;
};

export function AllergyListing({
  patientId,
  caseId,
  allergies,
  onRemove,
}: AllergyListingProps) {
  const { user } = useAuth();

  const [allergySuppressionSettings, setAllergySuppressionSettings] = useState<
    Record<AllergenName, AllergySuppressionSettingDto>
  >({});

  useEffect(() => {
    (async () => {
      const response =
        await RuleSettingsController.getAllergySuppressionSettings({
          path: {
            patientId,
            caseId,
          },
        });
      if (response.data) {
        setAllergySuppressionSettings(response.data);
      }
    })();
  }, [caseId, patientId]);

  const [removing, setRemoving] = useState("");
  const removeAllergy = useCallback(
    async (allergy: PatientAllergiesDto) => {
      setRemoving(allergy.allergy.id);
      for (const medicationAllergy of allergy.medicationAllergies) {
        await PatientController.deleteMedicationAllergy({
          path: {
            patientId,
            caseId,
            allergyId: medicationAllergy.id,
          },
        });
      }
      await PatientController.deleteAllergy({
        path: {
          patientId,
          caseId,
          allergyId: allergy.allergy.id,
        },
      });
      onRemove(allergy.allergy);
    },
    [caseId, onRemove, patientId],
  );

  const isSuppressed = useCallback(
    (allergen: AllergenName) => {
      return (
        allergySuppressionSettings[allergen]?.suppressionState === "SUPPRESSED"
      );
    },
    [allergySuppressionSettings],
  );

  const removeAllAllergies = useCallback(async () => {
    await PatientController.deleteAllAllergies({
      path: {
        patientId,
        caseId,
      },
    });
    allergies.forEach((it) => onRemove(it.allergy));
  }, [allergies, caseId, onRemove, patientId]);

  return (
    <div>
      {allergies.some((allergy) => isSuppressed(allergy.allergy.allergen)) ? (
        <small>
          <s>strikethrough</s> indicates allergy is suppressed for the current
          user: <i>{isLoaded(user) ? user.name : "not logged in"}</i>
        </small>
      ) : (
        ""
      )}
      <div className="d-flex flex-row-reverse mb-3">
        <Button
          variant="danger"
          className="mb-3"
          onClick={() => removeAllAllergies()}
        >
          <FontAwesomeIcon icon={faTrash} /> <span>Delete All</span>
        </Button>
      </div>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Allergen</th>
            <th>Severity</th>
            <th>Reaction</th>
            <th>Comments</th>
            <th>Code</th>
            <th>Impacted Medication(s)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {allergies.map((allergy, index) => {
            return (
              <tr
                key={allergy.allergy.id + "-" + index}
                style={{
                  textDecoration: isSuppressed(allergy.allergy.allergen)
                    ? "line-through"
                    : "inherit",
                }}
              >
                <td>
                  <CopyableIdentifier value={allergy.allergy.id} />
                </td>
                <td>{allergy.allergy.allergen}</td>
                <td>{allergy.allergy.severity}</td>
                <td>
                  {allergy.allergy.displayReaction}
                  {allergy.allergy.displayReaction !==
                    allergy.allergy.reaction && (
                    <span style={{ color: "#999", fontSize: "0.85em" }}>
                      {" "}
                      ({allergy.allergy.reaction})
                    </span>
                  )}
                  {allergy.allergy.reactionNotes &&
                    Object.keys(allergy.allergy.reactionNotes).length !== 0 && (
                      <div
                        style={{
                          marginTop: "8px",
                          fontSize: "0.9em",
                          color: "#666",
                        }}
                      >
                        <strong>Notes:</strong>
                        <ul style={{ marginBottom: 0, paddingLeft: "16px" }}>
                          {Object.entries(allergy.allergy.reactionNotes).map(
                            ([key, value]) => (
                              <li key={key}>{value}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </td>
                <td>{allergy.allergy.comments}</td>
                <td>
                  {allergy.allergy.rxnormIdentifier
                    ? "RxNorm: " + allergy.allergy.rxnormIdentifier
                    : allergy.allergy.snomedIdentifier
                    ? "SNOMED: " + allergy.allergy.snomedIdentifier
                    : "Unknown"}
                </td>
                <td>
                  <ul>
                    {allergy.medicationAllergies.map((medicationAllergy) => {
                      return (
                        <li key={medicationAllergy.id}>
                          {medicationAllergy.medication}
                        </li>
                      );
                    })}
                  </ul>
                </td>
                <td>
                  {removing === allergy.allergy.id ? (
                    <Spinner />
                  ) : (
                    <FontAwesomeIcon
                      icon={faTrash}
                      onClick={(e) => removeAllergy(allergy)}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
