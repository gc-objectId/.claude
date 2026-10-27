import { useQuery } from "@tanstack/react-query";
import { getJobsByCaseIdOptions } from "@api/@tanstack/react-query.gen";
import { CaseId } from "@api";
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

  if (isLoading) return <p>Loading...</p>;
  if (isError) {
    return (
      <div className="alert alert-danger">
        Failed to load jobs:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  return <JobQueueDisplay jobs={jobs ?? []} onJobTriggered={refetch} />;
}
