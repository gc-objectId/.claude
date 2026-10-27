import { AddConditionForm } from "./AddConditionForm";
import { ConditionListing } from "./ConditionListing";
import React, { useCallback, useEffect, useState } from "react";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import { PatientController } from "@api";
import type { PatientConditionDto } from "@api";

import { logger } from "../../../../utils/logger";
export type ConditionsTabProps = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

export function ConditionsTab({ context, isActive }: ConditionsTabProps) {
  const [conditions, setConditions] = useState<PatientConditionDto[]>([]);

  const loadConditions = useCallback(async () => {
    logger.debug("loading conditions");
    const { data } = await PatientController.getPatientConditions({
      path: { patientId: context.patient.pmrn },
    });
    if (data) {
      logger.debug("Got conditions", data);
      setConditions(data);
    }
  }, [context.patient.pmrn]);

  useEffect(() => {
    if (isActive) loadConditions();
  }, [loadConditions, isActive]);

  const handleDeleteCondition = async (condition: PatientConditionDto) => {
    if (!condition.uuid) return;
    await PatientController.deletePatientCondition({
      path: {
        patientId: context.patient.pmrn,
        conditionUUID: condition.uuid,
      },
    });
    loadConditions();
  };

  const handleAddCondition = useCallback(
    async (condition: Omit<PatientConditionDto, "uuid">) => {
      await PatientController.addPatientCondition({
        path: { patientId: context.patient.pmrn },
        body: condition,
      });
      loadConditions();
    },
    [context.patient.pmrn, loadConditions],
  );

  return (
    <div>
      <AddConditionForm onAdd={handleAddCondition} />
      <ConditionListing
        conditions={conditions}
        onDelete={handleDeleteCondition}
      />
    </div>
  );
}
