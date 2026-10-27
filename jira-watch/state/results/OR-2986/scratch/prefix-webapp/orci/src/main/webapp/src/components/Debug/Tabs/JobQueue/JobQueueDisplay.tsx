import React, { useState } from "react";
import { Badge, Button, OverlayTrigger, Table, Tooltip } from "react-bootstrap";
import { JobMetadataDto, QuartzController } from "@api";
import { JSONView } from "../../JSONView";
import { Play } from "react-bootstrap-icons";
import { inMemory, PaginatedView } from "../../../Admin/PaginatedView";

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds % 60}s`;
}

function StatusBadge({ job }: { job: JobMetadataDto }) {
  if (job.completed) {
    return <Badge bg="success">Completed</Badge>;
  }
  if (job.nextFireTime) {
    return <Badge bg="primary">Scheduled</Badge>;
  }
  return (
    <Badge bg="warning" text="dark">
      Running
    </Badge>
  );
}

function TriggerButton({
  job,
  onTriggered,
}: {
  job: JobMetadataDto;
  onTriggered: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    if (!job.jobName || !job.jobGroup) return;
    setLoading(true);
    setError(false);
    try {
      const res = await QuartzController.triggerJob({
        query: { jobName: job.jobName, jobGroup: job.jobGroup },
      });
      if (!res.error) {
        onTriggered();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <OverlayTrigger
      overlay={
        <Tooltip>
          <small>
            Run the job&apos;s code immediately. This does not change its
            scheduled state, and it will not appear in the executed section.
          </small>
        </Tooltip>
      }
    >
      <Button
        variant={error ? "outline-danger" : "outline-secondary"}
        size="sm"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          "…"
        ) : error ? (
          "Failed"
        ) : (
          <>
            <Play />
            Debug Invoke
          </>
        )}
      </Button>
    </OverlayTrigger>
  );
}

function ScheduledJobsTable({
  jobs,
  onJobTriggered,
}: {
  jobs: JobMetadataDto[];
  onJobTriggered: () => void;
}) {
  return (
    <Table striped bordered hover size="sm" responsive>
      <thead>
        <tr>
          <th>Job Name</th>
          <th>Group</th>
          <th>Class</th>
          <th>Status</th>
          <th>Start Date</th>
          <th>Duration</th>
          <th>Next Fire</th>
          <th>Order ID</th>
          <th>Description</th>
          <th>Context</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id}>
            <td>
              <code style={{ fontSize: "0.8em" }}>{job.jobName}</code>
            </td>
            <td>{job.jobGroup}</td>
            <td>{job.jobClassName ?? "—"}</td>
            <td>
              <StatusBadge job={job} />
            </td>
            <td>{formatDate(job.startDate)}</td>
            <td>
              {job.nextFireTime
                ? "not started yet"
                : formatDuration(job.executionDurationMs)}
            </td>
            <td>{formatDate(job.nextFireTime)}</td>
            <td>{job.orderId ?? "—"}</td>
            <td>{job.description ?? "—"}</td>
            <td>
              <JSONView data={job.jobContext} />
            </td>
            <td>
              <TriggerButton job={job} onTriggered={onJobTriggered} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function JobsTable({ jobs }: { jobs: JobMetadataDto[] }) {
  return (
    <PaginatedView
      queryKey={["debug", "jobs"]}
      searchable={false}
      queryFn={inMemory(jobs)}
    >
      {({ items: jobsPage }) => (
        <Table striped bordered hover size="sm" responsive>
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Group</th>
              <th>Class</th>
              <th>Status</th>
              <th>Start Date</th>
              <th>Duration</th>
              <th>Next Fire</th>
              <th>Order ID</th>
              <th>Description</th>
              <th>Context</th>
            </tr>
          </thead>
          <tbody>
            {jobsPage.map((job) => (
              <tr key={job.id}>
                <td>
                  <code style={{ fontSize: "0.8em" }}>{job.jobName}</code>
                </td>
                <td>{job.jobGroup}</td>
                <td>{job.jobClassName ?? "—"}</td>
                <td>
                  <StatusBadge job={job} />
                </td>
                <td>{formatDate(job.startDate)}</td>
                <td>{formatDuration(job.executionDurationMs)}</td>
                <td>{formatDate(job.nextFireTime)}</td>
                <td>{job.orderId ?? "—"}</td>
                <td>{job.description ?? "—"}</td>
                <td>
                  <JSONView data={job.jobContext} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </PaginatedView>
  );
}

export function JobQueueDisplay({
  jobs,
  onJobTriggered,
}: {
  jobs: JobMetadataDto[];
  onJobTriggered: () => void;
}) {
  const scheduled = jobs.filter((j) => !j.completed);
  const executed = jobs.filter((j) => j.completed);

  return (
    <>
      <section className="mb-5">
        <h5>
          Scheduled{" "}
          <Badge bg="primary" className="ms-1">
            {scheduled.length}
          </Badge>
        </h5>
        {scheduled.length === 0 ? (
          <p className="text-muted">No scheduled jobs.</p>
        ) : (
          <ScheduledJobsTable
            jobs={scheduled}
            onJobTriggered={onJobTriggered}
          />
        )}
      </section>

      <section>
        <h5>
          Executed{" "}
          <Badge bg="secondary" className="ms-1">
            {executed.length}
          </Badge>
        </h5>
        {executed.length === 0 ? (
          <p className="text-muted">No executed jobs.</p>
        ) : (
          <JobsTable jobs={executed} />
        )}
      </section>
    </>
  );
}
