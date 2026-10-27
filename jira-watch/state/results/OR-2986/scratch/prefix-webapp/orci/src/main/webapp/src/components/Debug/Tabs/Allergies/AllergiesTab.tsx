import { Button } from "react-bootstrap";
import { AddAllergy } from "./AddAllergy";
import { AllergyListing } from "./AllergyListing";
import React, { useCallback, useEffect, useState } from "react";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import { useDebouncedCallback } from "use-debounce";
import { PatientAllergiesDto, PatientController } from "@api";

export type AllergiesTabProps = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

export function AllergiesTab({ context, isActive }: AllergiesTabProps) {
  const [allergies, setAllergies] = useState<PatientAllergiesDto[]>([]);
  const [showAddAllergies, setShowAddAllergies] = useState(false);

  const loadAllergies = useCallback(async () => {
    const response = await PatientController.getAllergies({
      path: {
        patientId: context.patient.pmrn,
      },
    });
    if (response.data) {
      setAllergies(response.data);
    } else {
      console.error(response.error);
    }
  }, [context.patient.pmrn]);

  useEffect(() => {
    if (isActive) {
      loadAllergies();
    }
  }, [loadAllergies, isActive]);

  const handleAddAllergy = useCallback(async () => {
    await loadAllergies();
    setShowAddAllergies(false);
  }, [loadAllergies]);

  const debouncedLoadAllergies = useDebouncedCallback(
    () => loadAllergies(),
    100,
    { trailing: true },
  );

  return (
    <div>
      <div className="d-flex flex-row-reverse mb-3">
        <Button variant="primary" onClick={() => setShowAddAllergies(true)}>
          Add Allergy
        </Button>
      </div>

      <AddAllergy
        patientId={context.patient.pmrn}
        caseId={context.operation.caseId}
        show={showAddAllergies}
        handleSave={handleAddAllergy}
        handleCancel={() => setShowAddAllergies(false)}
      />
      <AllergyListing
        patientId={context.patient.pmrn}
        caseId={context.operation.caseId}
        allergies={allergies}
        onRemove={debouncedLoadAllergies}
      />
    </div>
  );
}
