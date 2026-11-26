import { useQuery } from "@tanstack/react-query";
import { getJobsByCaseIdOptions } from "@api/@tanstack/react-query.gen";
import { CaseId } from "@api";
import { Alert, Spinner } from "react-bootstrap";
import { JobQueueDisplay } from "./JobQueueDisplay";

type JobQueueTabProps = {
  isActive: boolean;
  caseId: string;
};

export function JobQueueTab({ caseId, isActive }: JobQueueTabProps) {
  const {
    data: jobs,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...getJobsByCaseIdOptions({
      query: { caseId: caseId as CaseId },
    }),
    enabled: isActive,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  if (isLoading) return <Spinner />;
  if (isError) {
    return (
      <Alert variant="danger">
        Failed to load jobs:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </Alert>
    );
  }

  return <JobQueueDisplay jobs={jobs ?? []} onJobTriggered={refetch} />;
}
