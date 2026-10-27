import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  InputGroup,
  Spinner,
  Table,
} from "react-bootstrap";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import type { TrackedValueDto } from "@api";
import { PatientController } from "@api";

export type ISCDebugProps = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

export function ISCDebug({ context, isActive }: ISCDebugProps) {
  const [currentISC, setCurrentISC] = useState<TrackedValueDto | null>(null);
  const [iscHistory, setISCHistory] = useState<TrackedValueDto[]>([]);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initSuccess, setInitSuccess] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [updateValue, setUpdateValue] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<
    string | null
  >(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const loadCurrentISC = useCallback(async () => {
    if (!context?.patient?.pmrn) return;

    setLoadingCurrent(true);
    setError(null);
    try {
      const { data } = await PatientController.getCurrentIsc({
        path: { patientId: context.patient.pmrn },
      });
      setCurrentISC(data ?? null);
    } catch (e: any) {
      // 204 means no content, which is expected if no ISC exists
      if (e?.status === 204) {
        setCurrentISC(null);
      } else {
        setError(e.message);
      }
    }
    setLoadingCurrent(false);
  }, [context?.patient?.pmrn]);

  const loadISCHistory = useCallback(async () => {
    if (!context?.patient?.pmrn) return;

    setLoadingHistory(true);
    setError(null);
    try {
      const { data } = await PatientController.getIscHistory({
        path: {
          patientId: context.patient.pmrn,
          caseId: context.operation.caseId,
        },
      });
      setISCHistory(data ?? []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoadingHistory(false);
  }, [context?.patient?.pmrn, context?.operation?.caseId]);

  const handleInitializeISC = useCallback(async () => {
    if (!context?.patient?.pmrn || !context?.operation?.caseId) return;

    setInitializing(true);
    setError(null);
    setInitSuccess(false);
    try {
      await PatientController.initializeIsc({
        path: {
          patientId: context.patient.pmrn,
          caseId: context.operation.caseId,
        },
      });
      setInitSuccess(true);
      loadCurrentISC();
      loadISCHistory();
    } catch (e: any) {
      setError(e.message);
    }
    setInitializing(false);
  }, [
    context?.patient?.pmrn,
    context?.operation?.caseId,
    loadCurrentISC,
    loadISCHistory,
  ]);

  const handleUpdateISC = useCallback(async () => {
    if (!context?.patient?.pmrn || !context?.operation?.caseId) return;

    const valueNum = parseFloat(updateValue);
    if (isNaN(valueNum)) {
      setError("Please enter a valid numeric value");
      return;
    }

    setUpdating(true);
    setError(null);
    setUpdateSuccess(false);
    try {
      const { data } = await PatientController.updateIsc({
        path: {
          patientId: context.patient.pmrn,
          caseId: context.operation.caseId,
        },
        body: { value: valueNum, note: "Manually updated" },
      });
      if (data) {
        setUpdateSuccess(true);
        setCurrentISC(data);
        setUpdateValue("");
        loadISCHistory();
      }
    } catch (e: any) {
      setError(e.message);
    }
    setUpdating(false);
  }, [
    context?.patient?.pmrn,
    context?.operation?.caseId,
    updateValue,
    loadISCHistory,
  ]);

  const handleDeleteISC = useCallback(
    async (iscId: string) => {
      if (!context?.patient?.pmrn) return;

      setDeletingId(iscId);
      setError(null);
      setDeleteSuccessMessage(null);
      try {
        await PatientController.deleteIsc({
          path: { patientId: context.patient.pmrn, iscId },
        });
        setDeleteSuccessMessage("ISC value deleted successfully!");
        if (currentISC?.id === iscId) {
          setCurrentISC(null);
        }
        loadCurrentISC();
        loadISCHistory();
      } catch (e: any) {
        setError(e.message);
      }
      setDeletingId(null);
    },
    [context?.patient?.pmrn, currentISC?.id, loadCurrentISC, loadISCHistory],
  );

  const handleDeleteAllISC = useCallback(async () => {
    if (!context?.patient?.pmrn) return;

    setDeletingAll(true);
    setError(null);
    setDeleteSuccessMessage(null);
    try {
      await PatientController.deleteAllIsc({
        path: {
          patientId: context.patient.pmrn,
          caseId: context.operation.caseId,
        },
      });
      setDeleteSuccessMessage("All ISC values deleted successfully!");
      setCurrentISC(null);
      setISCHistory([]);
      loadCurrentISC();
      loadISCHistory();
    } catch (e: any) {
      setError(e.message);
    }
    setDeletingAll(false);
  }, [
    context.patient.pmrn,
    context.operation.caseId,
    loadCurrentISC,
    loadISCHistory,
  ]);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      setHasLoaded(true);
      loadCurrentISC();
      loadISCHistory();
    }
  }, [isActive, hasLoaded, loadCurrentISC, loadISCHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div>
      <h4 className="mb-3">ISC (Insulin Sensitivity Coefficient) Debugging</h4>

      {error && (
        <Alert variant="danger" className="mb-3">
          Error: {error}
        </Alert>
      )}

      {initSuccess && (
        <Alert
          variant="success"
          className="mb-3"
          dismissible
          onClose={() => setInitSuccess(false)}
        >
          ISC initialization triggered successfully!
        </Alert>
      )}

      {updateSuccess && (
        <Alert
          variant="success"
          className="mb-3"
          dismissible
          onClose={() => setUpdateSuccess(false)}
        >
          ISC updated successfully!
        </Alert>
      )}

      {deleteSuccessMessage && (
        <Alert
          variant="success"
          className="mb-3"
          dismissible
          onClose={() => setDeleteSuccessMessage(null)}
        >
          {deleteSuccessMessage}
        </Alert>
      )}

      <div className="mb-4">
        <Card>
          <Card.Header>
            <h5 className="mb-0">Current ISC Value</h5>
          </Card.Header>
          <Card.Body>
            <div className="mb-3">
              <Button
                onClick={loadCurrentISC}
                disabled={loadingCurrent}
                variant="primary"
                size="sm"
                className="me-2"
              >
                {loadingCurrent ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Loading...
                  </>
                ) : (
                  "Refresh Current ISC"
                )}
              </Button>
              <Button
                onClick={handleInitializeISC}
                disabled={initializing || !context?.operation?.caseId}
                variant="success"
                size="sm"
                className="me-2"
              >
                {initializing ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Initializing...
                  </>
                ) : (
                  "Initialize ISC"
                )}
              </Button>
              <Button
                onClick={() =>
                  currentISC?.id ? handleDeleteISC(currentISC.id) : null
                }
                disabled={
                  !currentISC || deletingId === currentISC.id || deletingAll
                }
                variant="danger"
                size="sm"
              >
                {deletingId === currentISC?.id ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete Current ISC"
                )}
              </Button>
            </div>

            {currentISC ? (
              <Table bordered size="sm">
                <tbody>
                  <tr>
                    <th>Value</th>
                    <td>
                      <strong>{currentISC.value}</strong>
                    </td>
                  </tr>
                  <tr>
                    <th>Created Date</th>
                    <td>{formatDate(currentISC.createdDate)}</td>
                  </tr>
                  <tr>
                    <th>Note</th>
                    <td>{currentISC.note || "N/A"}</td>
                  </tr>
                  <tr>
                    <th>Operation Case ID</th>
                    <td>{currentISC.operationCaseId || "N/A"}</td>
                  </tr>
                </tbody>
              </Table>
            ) : (
              <Alert variant="info">
                No ISC value found. Click &ldquo;Initialize ISC&rdquo; to create
                one.
              </Alert>
            )}
          </Card.Body>
        </Card>
      </div>

      <div className="mb-4">
        <Card>
          <Card.Header>
            <h5 className="mb-0">Manually Update ISC</h5>
          </Card.Header>
          <Card.Body>
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateISC();
              }}
            >
              <Form.Group className="mb-3">
                <Form.Label>New ISC Value</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    step="0.001"
                    value={updateValue}
                    onChange={(e) => setUpdateValue(e.target.value)}
                    placeholder="e.g., 0.1"
                    disabled={updating || !context?.operation?.caseId}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={
                      updating || !updateValue || !context?.operation?.caseId
                    }
                  >
                    {updating ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Updating...
                      </>
                    ) : (
                      "Update ISC"
                    )}
                  </Button>
                </InputGroup>
              </Form.Group>
            </Form>
          </Card.Body>
        </Card>
      </div>

      <div className="mb-4">
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">ISC History</h5>
            <div>
              <Button
                onClick={handleDeleteAllISC}
                disabled={
                  deletingAll || loadingHistory || iscHistory.length === 0
                }
                variant="danger"
                size="sm"
                className="me-2"
              >
                {deletingAll ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Deleting All...
                  </>
                ) : (
                  "Delete All"
                )}
              </Button>
              <Button
                onClick={loadISCHistory}
                disabled={loadingHistory}
                variant="secondary"
                size="sm"
              >
                {loadingHistory ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Loading...
                  </>
                ) : (
                  "Refresh History"
                )}
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            {iscHistory.length > 0 ? (
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Value</th>
                    <th>Created Date</th>
                    <th>Note</th>
                    <th>Operation Case ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {iscHistory.map((isc) => (
                    <tr key={isc.id}>
                      <td>
                        <strong>{isc.value}</strong>
                      </td>
                      <td>{formatDate(isc.createdDate)}</td>
                      <td>{isc.note || "N/A"}</td>
                      <td>{isc.operationCaseId || "N/A"}</td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteISC(isc.id)}
                          disabled={deletingId === isc.id || deletingAll}
                        >
                          {deletingId === isc.id ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Deleting...
                            </>
                          ) : (
                            "Delete"
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Alert variant="info">
                No ISC history found for this patient.
              </Alert>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
