import "../../App.scss";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Container, Spinner } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
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
    <Container fluid>
      <Header />
      <main role="main">
        <div className="mb-2">
          <small>
            <Link to={`/admin/patients?client_id=${tenantId}`}>Patients</Link>{" "}
            &gt;{" "}
            <Link to={`/admin/patients/${patientUuid}?client_id=${tenantId}`}>
              View Patient
            </Link>{" "}
            &gt; View Operation
          </small>
        </div>
        {error && <Alert variant="danger">Unable to load case: {error}</Alert>}
        {!error && !context && <Spinner />}
        {context && (
          <>
            <h1>{context.patient.fullName}</h1>
            <p className="text-muted">Case {context.operation.caseId}</p>
            <DebuggerTabs
              context={context}
              setContext={setContext}
              guidance={[]}
            />
          </>
        )}
      </main>
      <Footer />
    </Container>
  );
}

export default ViewOperation;
