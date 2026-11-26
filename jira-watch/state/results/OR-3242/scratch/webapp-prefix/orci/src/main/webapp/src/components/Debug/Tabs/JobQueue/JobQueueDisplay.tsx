import React, { useState } from "react";
import { Badge, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { JobMetadataDto, QuartzController } from "@api";
import { JSONView } from "../../JSONView";
import { Play } from "react-bootstrap-icons";
import { inMemory, PaginatedView } from "../../../Admin/PaginatedView";
import { AdminTable } from "../../../Admin/AdminTable";
import { SectionHeader } from "../../../SectionHeader";

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
          Run the job&apos;s code immediately. This does not change its
          scheduled state, and it will not appear in the executed section.
        </Tooltip>
      }
    >
      <Button
        variant={error ? "outline-danger" : "outline-primary"}
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
            <Play aria-hidden="true" /> Debug Invoke
          </>
        )}
      </Button>
    </OverlayTrigger>
  );
}

function JobRow({
  job,
  duration,
  actions,
}: {
  job: JobMetadataDto;
  duration: string;
  actions?: React.ReactNode;
}) {
  return (
    <tr>
      <td>
        <span className="admin-code">{job.jobName}</span>
      </td>
      <td>{job.jobGroup}</td>
      <td>{job.jobClassName ?? "—"}</td>
      <td>
        <StatusBadge job={job} />
      </td>
      <td>{formatDate(job.startDate)}</td>
      <td>{duration}</td>
      <td>{formatDate(job.nextFireTime)}</td>
      <td>{job.orderId ?? "—"}</td>
      <td>{job.description ?? "—"}</td>
      <td>
        <JSONView data={job.jobContext} />
      </td>
      {actions !== undefined && <td>{actions}</td>}
    </tr>
  );
}

function JobTableHead({ withActions }: { withActions: boolean }) {
  return (
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
        {withActions && (
          <th>
            <span className="visually-hidden">Actions</span>
          </th>
        )}
      </tr>
    </thead>
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
    <AdminTable size="sm">
      <JobTableHead withActions />
      <tbody>
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            duration={
              job.nextFireTime
                ? "not started yet"
                : formatDuration(job.executionDurationMs)
            }
            actions={<TriggerButton job={job} onTriggered={onJobTriggered} />}
          />
        ))}
      </tbody>
    </AdminTable>
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
        <AdminTable size="sm">
          <JobTableHead withActions={false} />
          <tbody>
            {jobsPage.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                duration={formatDuration(job.executionDurationMs)}
              />
            ))}
          </tbody>
        </AdminTable>
      )}
    </PaginatedView>
  );
}

function JobSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-section">
      <SectionHeader
        title={
          <>
            {title} <span className="guided-tag">{count}</span>
          </>
        }
      />
      {children}
    </section>
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
      <JobSection title="Scheduled" count={scheduled.length}>
        {scheduled.length === 0 ? (
          <div className="admin-empty">No scheduled jobs.</div>
        ) : (
          <ScheduledJobsTable
            jobs={scheduled}
            onJobTriggered={onJobTriggered}
          />
        )}
      </JobSection>

      <JobSection title="Executed" count={executed.length}>
        {executed.length === 0 ? (
          <div className="admin-empty">No executed jobs.</div>
        ) : (
          <JobsTable jobs={executed} />
        )}
      </JobSection>
    </>
  );
}
