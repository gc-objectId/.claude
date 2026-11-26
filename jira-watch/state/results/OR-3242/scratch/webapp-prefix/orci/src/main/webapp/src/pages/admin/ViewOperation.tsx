import "../../App.scss";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Spinner } from "react-bootstrap";
import { useParams } from "react-router-dom";

import PatientService from "../../services/PatientService";
import { DebuggerTabs } from "../../components/Debug/DebuggerTabs";
import { ApplicationLaunchContext } from "../../types/ApplicationLaunchContext";
import { OperationUUID, PatientUUID } from "../../types/identifiers";
import { deriveTenantId } from "../../utils/tenant";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Opens the debugger against an operation that is already on file without starting it.
 * Note the guarantee is about the launch only: the debugger tabs still carry their
 * usual edit controls, and using them changes the case.
 */
function ViewOperation() {
  const { patientUuid, operationUuid } = useParams();
  const tenantId = deriveTenantId();
  const patientService = useMemo(() => new PatientService(), []);

  const [context, setContext] = useState<ApplicationLaunchContext>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (
      !patientUuid ||
      !operationUuid ||
      !UUID_PATTERN.test(patientUuid) ||
      !UUID_PATTERN.test(operationUuid)
    ) {
      setError("that is not a valid patient or operation id.");
      return;
    }
    patientService
      .getOperationContext(
        PatientUUID.check(patientUuid),
        OperationUUID.check(operationUuid),
      )
      .then((result) => {
        result.ifRight(setContext);
        result.ifLeft((e) => setError(String(e)));
      });
  }, [patientService, patientUuid, operationUuid]);

  return (
    <AdminPage fluid>
      <AdminPageHeader
        trail={[
          { label: "Patients", to: `/admin/patients?client_id=${tenantId}` },
          {
            label: "Patient",
            to: `/admin/patients/${patientUuid}?client_id=${tenantId}`,
          },
        ]}
        title={context?.patient.fullName ?? "Operation"}
        meta={context && `Case ${context.operation.caseId}`}
      />
      {error && <Alert variant="danger">Unable to load case: {error}</Alert>}
      {!error && !context && <Spinner />}
      {context && (
        <DebuggerTabs context={context} setContext={setContext} guidance={[]} />
      )}
    </AdminPage>
  );
}

export default ViewOperation;
