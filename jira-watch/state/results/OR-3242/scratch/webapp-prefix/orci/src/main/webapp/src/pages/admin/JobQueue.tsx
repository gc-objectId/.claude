import "../../App.scss";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { TenantScope } from "../../components/Admin/TenantScope";
import { Alert, Button, Form, InputGroup, Spinner } from "react-bootstrap";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getJobsByCaseIdOptions } from "@api/@tanstack/react-query.gen";
import { useAdminPanelContext } from "../../context/AdminPanelContext";
import { CaseId } from "@api";
import { TenantID } from "../../types/identifiers";
import { JobQueueDisplay } from "../../components/Debug/Tabs/JobQueue/JobQueueDisplay";

export function JobQueueContent() {
  const { tenantId: ctxTenantId, caseId: ctxCaseId } = useAdminPanelContext();
  const [tenantId, setTenantId] = useState<TenantID | undefined>(ctxTenantId);
  const [caseIdInputValue, setCaseIdInputValue] = useState<string>(
    ctxCaseId || "",
  );
  const [submittedCaseId, setSubmittedCaseId] = useState<CaseId | undefined>(
    ctxCaseId,
  );
  const {
    data: jobs,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...getJobsByCaseIdOptions({
      query: { caseId: submittedCaseId! },
      headers: { "X-Tenant-Id": tenantId },
    }),
    enabled: !!tenantId && !!submittedCaseId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (caseIdInputValue) {
      setSubmittedCaseId(caseIdInputValue.trim() as CaseId);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Job Queue"
        meta="Scheduled and in-flight background jobs for a case."
      />
      <Form onSubmit={handleSubmit} className="admin-toolbar">
        <TenantScope value={tenantId} onChange={setTenantId} />
        <InputGroup className="admin-toolbar__search">
          <InputGroup.Text>Case ID</InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Enter case ID"
            aria-label="Case ID"
            value={caseIdInputValue}
            onChange={(e) => setCaseIdInputValue(e.target.value)}
          />
          <Button type="submit">Load</Button>
        </InputGroup>
      </Form>

      {!tenantId ? (
        <div className="admin-empty">Select a tenant to look up a case.</div>
      ) : (
        !submittedCaseId && (
          <div className="admin-empty">Enter a case ID to see its jobs.</div>
        )
      )}
      {isLoading && (
        <div className="admin-empty">
          <Spinner size="sm" aria-hidden="true" />
          Loading jobs…
        </div>
      )}
      {isError && (
        <Alert variant="danger">
          Failed to load jobs:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      )}

      {jobs && <JobQueueDisplay jobs={jobs} onJobTriggered={refetch} />}
    </>
  );
}

function JobQueue() {
  return (
    <AdminPage>
      <JobQueueContent />
    </AdminPage>
  );
}

export default JobQueue;
