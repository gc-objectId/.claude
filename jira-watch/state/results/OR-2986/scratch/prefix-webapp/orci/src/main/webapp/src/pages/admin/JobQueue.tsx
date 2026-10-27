import "../../App.scss";
import { Container, Form, InputGroup } from "react-bootstrap";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getJobsByCaseIdOptions } from "@api/@tanstack/react-query.gen";
import { useAdminPanelContext } from "../../context/AdminPanelContext";
import { CaseId } from "@api";
import { JobQueueDisplay } from "../../components/Debug/Tabs/JobQueue/JobQueueDisplay";

export function JobQueueContent() {
  const { caseId: ctxCaseId } = useAdminPanelContext();
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
    }),
    enabled: !!submittedCaseId,
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
      <Form onSubmit={handleSubmit} className="mb-4">
        <InputGroup style={{ maxWidth: "500px" }}>
          <InputGroup.Text>Case ID</InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Enter case ID"
            value={caseIdInputValue}
            onChange={(e) => setCaseIdInputValue(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Load
          </button>
        </InputGroup>
      </Form>

      {isLoading && <p>Loading...</p>}
      {isError && (
        <div className="alert alert-danger">
          Failed to load jobs:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      {jobs && <JobQueueDisplay jobs={jobs} onJobTriggered={refetch} />}
    </>
  );
}

function JobQueue() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main" className="admin-main">
        <div className="mb-3">
          <small>Job Queue</small>
        </div>
        <JobQueueContent />
      </main>
      <Footer />
    </Container>
  );
}

export default JobQueue;
