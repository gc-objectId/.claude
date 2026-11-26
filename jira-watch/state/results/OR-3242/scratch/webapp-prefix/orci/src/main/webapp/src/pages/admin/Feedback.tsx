import { useState } from "react";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { AdminTable } from "../../components/Admin/AdminTable";
import { Fact, FactList } from "../../components/Admin/FactList";
import { PaginatedView } from "../../components/Admin/PaginatedView";
import { SectionHeader } from "../../components/SectionHeader";
import { TenantScope } from "../../components/Admin/TenantScope";
import { Button, Spinner } from "react-bootstrap";
import { X } from "react-bootstrap-icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Paginated } from "../../types/Paginated";
import { truncate } from "lodash";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { TenantID } from "../../types/identifiers";
import { DateTime } from "luxon";
import { deriveTenantId } from "../../utils/tenant";
import { useAdminPanelContext } from "../../context/AdminPanelContext";
import { FeedbackAdminController } from "../../api/generated/sdk.gen";
import type {
  FeedbackDto,
  PagedModelFeedbackDto,
} from "../../api/generated/types.gen";

function toPagedResult(
  response: PagedModelFeedbackDto,
): Paginated<FeedbackDto> {
  return {
    content: response.content ?? [],
    page: {
      size: response.page?.size ?? 0,
      totalElements: response.page?.totalElements ?? 0,
      totalPages: response.page?.totalPages ?? 0,
      number: response.page?.number ?? 0,
    },
  };
}

async function fetchFeedbackList(
  page: number,
  size: number,
  tenant: TenantID,
): Promise<Paginated<FeedbackDto>> {
  const { data } = await FeedbackAdminController.getFeedbackList({
    query: { page, size },
    headers: { "X-Tenant-Id": tenant },
  });
  return toPagedResult(data!);
}

async function fetchFeedbackSubmission(
  feedbackId: string,
  tenant: TenantID,
): Promise<FeedbackDto> {
  const { data } = await FeedbackAdminController.getFeedback({
    path: { id: feedbackId },
    headers: { "X-Tenant-Id": tenant },
  });
  return data!;
}

function FeedbackSubmission({
  feedbackId,
  tenant,
  onClose,
}: {
  feedbackId: string;
  tenant: TenantID;
  onClose: () => void;
}) {
  const feedbackSubmissionQ = useQuery({
    queryKey: [tenant, "feedback-submission", feedbackId],
    queryFn: () => fetchFeedbackSubmission(feedbackId, tenant),
    placeholderData: keepPreviousData,
  });

  if (feedbackSubmissionQ.isPending) {
    return (
      <div className="admin-empty">
        <Spinner size="sm" aria-hidden="true" />
        Loading feedback…
      </div>
    );
  }
  if (feedbackSubmissionQ.isError) {
    return (
      <div className="admin-empty text-danger">
        Error: {feedbackSubmissionQ.error.message}
      </div>
    );
  }
  const submission = feedbackSubmissionQ.data;
  return (
    <section className="admin-detail" aria-label="Feedback submission">
      <SectionHeader
        title="Feedback Submission"
        actions={
          <Button
            variant="link"
            className="admin-link-button"
            aria-label="Close feedback submission"
            onClick={onClose}
          >
            <X size={22} aria-hidden="true" />
          </Button>
        }
      />
      <FactList>
        <Fact label="User">{submission.userId}</Fact>
        <Fact label="Patient">{submission.patientId}</Fact>
        <Fact label="Case">{submission.caseId}</Fact>
        <Fact label="Date" wide>
          {submission.date &&
            DateTime.fromISO(submission.date).toLocaleString(
              DateTime.DATETIME_HUGE,
            )}
        </Fact>
      </FactList>
      <p className="admin-detail__body">{submission.comment}</p>
    </section>
  );
}

function FeedbackBody({
  tenant,
  onTenantChange,
  feedbackId,
  onSelect,
  onClose,
}: {
  tenant: TenantID | undefined;
  onTenantChange: (tenant: TenantID) => void;
  feedbackId: string | undefined;
  onSelect: (feedbackId: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <AdminPageHeader
        title="User Feedback"
        meta="Submissions from the in-app feedback widget."
      />
      <div className="admin-toolbar">
        <TenantScope value={tenant} onChange={onTenantChange} />
      </div>
      {!tenant ? (
        <div className="admin-empty">Select a tenant to see its feedback.</div>
      ) : (
        <>
          {feedbackId && (
            <FeedbackSubmission
              key={feedbackId}
              feedbackId={feedbackId}
              tenant={tenant}
              onClose={onClose}
            />
          )}
          <PaginatedView<FeedbackDto>
            searchable={false}
            queryKey={[tenant, "feedback-list"]}
            queryFn={(page, size) => fetchFeedbackList(page, size, tenant)}
          >
            {({ items }) => (
              <AdminTable className="admin-table--selectable">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Case</th>
                    <th>Patient</th>
                    <th>Comment</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="admin-table__empty">
                        No feedback submitted for this tenant yet.
                      </td>
                    </tr>
                  )}
                  {items.map((feedback) => (
                    <tr
                      key={feedback.id}
                      onClick={() => onSelect(feedback.id!)}
                    >
                      <td>{feedback.userId}</td>
                      <td>{feedback.caseId}</td>
                      <td>{feedback.patientId}</td>
                      <td title={feedback.comment}>
                        {truncate(feedback.comment, { length: 60 })}
                      </td>
                      <td>
                        {feedback.date &&
                          DateTime.fromISO(feedback.date).toLocaleString(
                            DateTime.DATETIME_SHORT,
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </PaginatedView>
        </>
      )}
    </>
  );
}

export function FeedbackContent() {
  const { tenantId: ctxTenantId } = useAdminPanelContext();
  const [tenant, setTenant] = useState<TenantID | undefined>(ctxTenantId);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string>();
  return (
    <FeedbackBody
      tenant={tenant}
      onTenantChange={(value) => {
        setTenant(value);
        setSelectedFeedbackId(undefined);
      }}
      feedbackId={selectedFeedbackId}
      onSelect={setSelectedFeedbackId}
      onClose={() => setSelectedFeedbackId(undefined)}
    />
  );
}

export function Feedback() {
  const { feedbackId } = useParams();
  const [searchParams] = useSearchParams();
  const tenant = deriveTenantId() ?? undefined;
  const navigate = useNavigate();
  const query = searchParams.toString();
  const withQuery = (path: string) => (query ? `${path}?${query}` : path);

  return (
    <AdminPage>
      <FeedbackBody
        tenant={tenant}
        onTenantChange={(value) =>
          navigate(
            `/admin/feedback-submissions?${new URLSearchParams({
              ...Object.fromEntries(searchParams),
              client_id: value,
            })}`,
          )
        }
        feedbackId={feedbackId}
        onSelect={(id) =>
          navigate(withQuery(`/admin/feedback-submissions/${id}`))
        }
        onClose={() => navigate(withQuery("/admin/feedback-submissions"))}
      />
    </AdminPage>
  );
}
