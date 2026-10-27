import Header from "../../components/Header";
import React, { useState } from "react";
import { Alert, Button, Container, Table } from "react-bootstrap";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isLastPage, Paginated } from "../../types/Paginated";
import { truncate } from "lodash";
import Stack from "react-bootstrap/Stack";
import {
  createSearchParams,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { TenantID } from "../../types/identifiers";
import { TenantPicker } from "../../components/Admin/TenantPicker";
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

export function FeedbackContent() {
  const { tenantId: ctxTenantId } = useAdminPanelContext();
  const [page, setPage] = useState(0);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string>();
  const [tenant, setTenant] = useState<TenantID | undefined>(ctxTenantId);

  const feedbackListQ = useQuery({
    queryKey: [tenant, "feedback-list", page],
    queryFn: () => fetchFeedbackList(page, 10, tenant!),
    enabled: !!tenant,
    placeholderData: keepPreviousData,
  });

  const feedbackSubmissionQ = useQuery({
    queryKey: [tenant, "feedback-submission", selectedFeedbackId],
    enabled: !!tenant && !!selectedFeedbackId,
    queryFn: () => fetchFeedbackSubmission(selectedFeedbackId!, tenant!),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <h3 className="my-3">User Feedback</h3>
      <div className="my-3">
        <TenantPicker value={tenant} onChange={setTenant} />
      </div>

      {!tenant ? (
        <div className="text-muted">Select a tenant to view feedback.</div>
      ) : (
        <>
          {feedbackSubmissionQ.isPending ? (
            feedbackSubmissionQ.isFetching && (
              <div>Loading feedback {selectedFeedbackId}...</div>
            )
          ) : feedbackSubmissionQ.isError ? (
            <div>Error: {feedbackSubmissionQ.error.message}</div>
          ) : (
            feedbackSubmissionQ.data && (
              <Alert
                dismissible
                key={selectedFeedbackId}
                className="my-3"
                onClose={() => setSelectedFeedbackId(undefined)}
              >
                <Alert.Heading>Feedback Submission</Alert.Heading>
                <b>User:</b> {feedbackSubmissionQ.data.userId}
                <br />
                <b>Patient:</b> {feedbackSubmissionQ.data.patientId}
                <br />
                <b>Case:</b> {feedbackSubmissionQ.data.caseId}
                <br />
                <b>Date:</b>{" "}
                {feedbackSubmissionQ.data.date &&
                  DateTime.fromISO(
                    feedbackSubmissionQ.data.date,
                  ).toLocaleString(DateTime.DATETIME_HUGE)}
                <hr />
                <p>
                  <b>Comment:</b>
                  <br />
                  {feedbackSubmissionQ.data.comment}
                </p>
              </Alert>
            )
          )}

          {feedbackListQ.isPending ? (
            <div>Loading...</div>
          ) : feedbackListQ.isError ? (
            <div>Error: {feedbackListQ.error.message}</div>
          ) : (
            <div>
              <div>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>user</th>
                      <th>case</th>
                      <th>patient</th>
                      <th>comment</th>
                      <th>date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackListQ.data.content.map((feedback) => (
                      <tr
                        key={feedback.id}
                        className="pointer"
                        onClick={() => setSelectedFeedbackId(feedback.id)}
                      >
                        <td>{feedback.userId}</td>
                        <td>{feedback.caseId}</td>
                        <td>{feedback.patientId}</td>
                        <td title={feedback.comment}>
                          {truncate(feedback.comment, { length: 30 })}
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
                </Table>
              </div>
              <span>
                Current Page: {page + 1} / {feedbackListQ.data.page.totalPages}
              </span>
              <Stack direction="horizontal" gap={1}>
                <Button
                  onClick={() => setPage((old) => Math.max(old - 1, 0))}
                  disabled={page === 0}
                >
                  Previous Page
                </Button>
                <Button
                  onClick={() => {
                    if (
                      !feedbackListQ.isPlaceholderData &&
                      !isLastPage(feedbackListQ.data)
                    ) {
                      setPage((old) => old + 1);
                    }
                  }}
                  disabled={
                    feedbackListQ.isPlaceholderData ||
                    isLastPage(feedbackListQ.data)
                  }
                >
                  Next Page
                </Button>
              </Stack>
              {feedbackListQ.isFetching ? <span> Loading...</span> : null}
            </div>
          )}
        </>
      )}
    </>
  );
}

export function Feedback() {
  const [page, setPage] = useState(0);
  const { feedbackId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tenant = deriveTenantId();
  const navigate = useNavigate();

  const feedbackListQ = useQuery({
    queryKey: [tenant, "feedback-list", page],
    queryFn: () => fetchFeedbackList(page, 10, tenant!),
    enabled: !!tenant,
    placeholderData: keepPreviousData,
  });

  const feedbackSubmissionQ = useQuery({
    queryKey: [tenant, "feedback-submission", feedbackId],
    enabled: !!tenant && !!feedbackId,
    queryFn: () => fetchFeedbackSubmission(feedbackId!, tenant!),
    placeholderData: keepPreviousData,
  });

  return (
    <Container fluid="md">
      <Header />
      <h3 className="my-3">User Feedback</h3>
      <div className="my-3">
        <TenantPicker
          value={tenant ?? undefined}
          onChange={(value) => {
            setSearchParams({ ...searchParams, client_id: value });
          }}
        />
      </div>

      {!tenant ? (
        <div className="text-muted">Select a tenant to view feedback.</div>
      ) : (
        <>
          {feedbackSubmissionQ.isPending ? (
            feedbackSubmissionQ.isFetching && (
              <div>Loading feedback {feedbackId}...</div>
            )
          ) : feedbackSubmissionQ.isError ? (
            <div>Error: {feedbackSubmissionQ.error.message}</div>
          ) : (
            feedbackSubmissionQ.data && (
              <Alert dismissible key={feedbackId} className="my-3">
                <Alert.Heading>Feedback Submission</Alert.Heading>
                <b>User:</b> {feedbackSubmissionQ.data.userId}
                <br />
                <b>Patient:</b> {feedbackSubmissionQ.data.patientId}
                <br />
                <b>Case:</b> {feedbackSubmissionQ.data.caseId}
                <br />
                <b>Date:</b>{" "}
                {feedbackSubmissionQ.data.date &&
                  DateTime.fromISO(
                    feedbackSubmissionQ.data.date,
                  ).toLocaleString(DateTime.DATETIME_HUGE)}
                <hr />
                <p>
                  <b>Comment:</b>
                  <br />
                  {feedbackSubmissionQ.data.comment}
                </p>
              </Alert>
            )
          )}

          {feedbackListQ.isPending ? (
            <div>Loading...</div>
          ) : feedbackListQ.isError ? (
            <div>Error: {feedbackListQ.error.message}</div>
          ) : (
            <div>
              <div>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>user</th>
                      <th>case</th>
                      <th>patient</th>
                      <th>comment</th>
                      <th>date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackListQ.data.content.map((feedback) => (
                      <tr
                        key={feedback.id}
                        className="pointer"
                        onClick={() =>
                          navigate(
                            `${feedback.id}?${createSearchParams(
                              searchParams,
                            )}`,
                          )
                        }
                      >
                        <td>{feedback.userId}</td>
                        <td>{feedback.caseId}</td>
                        <td>{feedback.patientId}</td>
                        <td title={feedback.comment}>
                          {truncate(feedback.comment, { length: 30 })}
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
                </Table>
              </div>
              <span>
                Current Page: {page + 1} / {feedbackListQ.data.page.totalPages}
              </span>
              <Stack direction="horizontal" gap={1}>
                <Button
                  onClick={() => setPage((old) => Math.max(old - 1, 0))}
                  disabled={page === 0}
                >
                  Previous Page
                </Button>
                <Button
                  onClick={() => {
                    if (
                      !feedbackListQ.isPlaceholderData &&
                      !isLastPage(feedbackListQ.data)
                    ) {
                      setPage((old) => old + 1);
                    }
                  }}
                  disabled={
                    feedbackListQ.isPlaceholderData ||
                    isLastPage(feedbackListQ.data)
                  }
                >
                  Next Page
                </Button>
              </Stack>
              {feedbackListQ.isFetching ? <span> Loading...</span> : null}
            </div>
          )}
        </>
      )}
    </Container>
  );
}
