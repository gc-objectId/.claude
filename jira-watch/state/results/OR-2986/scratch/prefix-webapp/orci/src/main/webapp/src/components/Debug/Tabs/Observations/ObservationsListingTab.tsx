import { Button, Spinner, Table } from "react-bootstrap";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import React, { useCallback, useEffect, useState } from "react";
import { DateTime } from "luxon";
import { AddObservation } from "./AddObservation";
import { Trash } from "react-bootstrap-icons";
import { AsyncSpinnerButton } from "../../../AsyncButton";
import { useDebouncedCallback } from "use-debounce";
import { isLoading, Loadable, loading } from "../../../../types/Loadable";
import { CopyableIdentifier } from "../../CopyableIdentifier";
import { ObservationController, ObservationDto } from "@api";

import { logger } from "../../../../utils/logger";
export type ObservationsListingTabProps = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

export function ObservationsListingTab({
  context,
  isActive,
}: ObservationsListingTabProps) {
  const [showAddObservation, setShowAddObservation] = useState<boolean>(false);
  const [observations, setObservations] = useState<Loadable<ObservationDto[]>>(
    loading(),
  );

  const loadObservations = useDebouncedCallback(async () => {
    logger.debug("loading observations");
    const response = await ObservationController.getObservations({
      path: {
        patientId: context.patient.pmrn,
      },
    });
    logger.debug("getObservations response:", response);
    if (response.data) {
      setObservations(response.data);
    }
  }, 500);

  useEffect(() => {
    logger.debug("OBS", isActive);
    if (isActive) {
      loadObservations();
    }
  }, [loadObservations, isActive]);

  const deleteObservation = useCallback(
    async (observationId: string) => {
      await ObservationController.deleteObservation({
        path: {
          patientId: context.patient.pmrn,
          observationId: observationId,
        },
      });
      loadObservations();
    },
    [context.patient.pmrn, loadObservations],
  );

  const deleteAllObservations = useCallback(async () => {
    await ObservationController.deleteAllObservations({
      path: {
        patientId: context.patient.pmrn,
      },
    });
    loadObservations();
  }, [context.patient.pmrn, loadObservations]);

  return (
    <div>
      <div className="d-flex flex-row-reverse mb-3">
        <div>
          <div className="d-flex justify-content-end mb-2">
            <Button
              variant="primary"
              className="align-content-end"
              onClick={() => setShowAddObservation(true)}
            >
              Add Observation
            </Button>
          </div>
          <div className="d-flex justify-content-end">
            <AsyncSpinnerButton
              variant="danger"
              onClick={deleteAllObservations}
            >
              Delete all
            </AsyncSpinnerButton>
          </div>
        </div>
      </div>

      <AddObservation
        patientId={context.patient.pmrn}
        caseId={context.operation.caseId}
        show={showAddObservation}
        handleSave={() => {
          loadObservations();
          setShowAddObservation(false);
        }}
        handleCancel={() => setShowAddObservation(false)}
      />

      <Table striped bordered hover id="observations">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Effective Time</th>
            <th>Observation Value</th>
            <th>Type</th>
            <th>Code System</th>
            <th>Code</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading(observations) ? (
            <Spinner />
          ) : (
            observations.map((observation, index) => {
              return (
                <tr key={observation.id}>
                  <td>
                    <CopyableIdentifier value={observation.id} />
                  </td>
                  <td>{observation.observationName}</td>
                  <td>
                    {observation.effectiveTime
                      ? DateTime.fromISO(
                          observation.effectiveTime,
                        ).toLocaleString(DateTime.DATETIME_SHORT)
                      : "--"}
                  </td>
                  <td>
                    {observation.observationValue}{" "}
                    {observation.observationUnits}
                  </td>
                  <td>{observation.type}</td>
                  <td>{observation.codeSystem}</td>
                  <td>{observation.code}</td>
                  <td>
                    <AsyncSpinnerButton
                      variant="outline-danger"
                      onClick={() => deleteObservation(observation.id!)}
                      size="sm"
                    >
                      <Trash className="d-flex align-items-center" />
                    </AsyncSpinnerButton>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>
    </div>
  );
}
