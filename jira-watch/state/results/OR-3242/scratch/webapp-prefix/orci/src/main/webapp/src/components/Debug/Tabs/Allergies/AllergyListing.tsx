import { Button, Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import React, { useCallback, useEffect, useState } from "react";
import { AllergenName, CaseID, PatientID } from "../../../../types/identifiers";
import { useAuth } from "../../../../context/AuthContext";
import { isLoggedIn } from "../../../../types/User";
import { CopyableIdentifier } from "../../CopyableIdentifier";
import { AdminTable } from "../../../Admin/AdminTable";
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

  return (
    <div>
      {allergies.some((allergy) => isSuppressed(allergy.allergy.allergen)) && (
        <p className="admin-section__lede">
          <s>Strikethrough</s> marks an allergy suppressed for the current user:{" "}
          <i>{isLoggedIn(user) ? user.name : "not logged in"}</i>
        </p>
      )}
      <AdminTable>
        <thead>
          <tr>
            <th>ID</th>
            <th>Allergen</th>
            <th>Severity</th>
            <th>Reaction</th>
            <th>Comments</th>
            <th>Code</th>
            <th>Impacted Medication(s)</th>
            <th>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {allergies.map((allergy, index) => {
            return (
              <tr
                key={allergy.allergy.id + "-" + index}
                className={
                  isSuppressed(allergy.allergy.allergen)
                    ? "text-decoration-line-through"
                    : undefined
                }
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
                    <span className="small text-secondary">
                      {" "}
                      ({allergy.allergy.reaction})
                    </span>
                  )}
                  {allergy.allergy.reactionNotes &&
                    Object.keys(allergy.allergy.reactionNotes).length !== 0 && (
                      <div className="small text-secondary mt-2">
                        <strong>Notes:</strong>
                        <ul className="mb-0 ps-3">
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
                  {allergy.medicationAllergies.length > 0 && (
                    <ul className="mb-0 ps-3">
                      {allergy.medicationAllergies.map((medicationAllergy) => {
                        return (
                          <li key={medicationAllergy.id}>
                            {medicationAllergy.medication}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </td>
                <td>
                  <div className="admin-table__actions">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="admin-icon-button"
                      title="Delete allergy"
                      disabled={removing === allergy.allergy.id}
                      onClick={() => removeAllergy(allergy)}
                    >
                      {removing === allergy.allergy.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <FontAwesomeIcon icon={faTrash} />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </AdminTable>
    </div>
  );
}
