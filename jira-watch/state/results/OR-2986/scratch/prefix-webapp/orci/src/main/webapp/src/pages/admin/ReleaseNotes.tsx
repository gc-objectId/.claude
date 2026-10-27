import { TenantID } from "../../types/identifiers";
import {
  Button,
  Col,
  Container,
  Form,
  Modal,
  Tab,
  Table,
  Tabs,
} from "react-bootstrap";
import axios, { isAxiosError } from "axios";
import { Paginated } from "../../types/Paginated";
import { useNavigate, useParams } from "react-router-dom";
import React, { useCallback, useState } from "react";
import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query";
import { isEmpty, isNil, truncate } from "lodash";
import { DateTime } from "luxon";
import { ErrorMessage, Formik } from "formik";
import { BootstrapField } from "../../components/Form/BootstrapField";
import { DatePickerField } from "../../components/Form/DatePickerField";
import { Trash } from "react-bootstrap-icons";
import { AsyncSpinnerButton } from "../../components/AsyncButton";
import { sanitizedHtml } from "../../utils/markup";
import { marked } from "marked";
import { PaginatedView } from "../../components/Admin/PaginatedView";
import Header from "../../components/Header";
import { TenantPicker } from "../../components/Admin/TenantPicker";
import { deriveTenantId } from "../../utils/tenant";
import { useAdminPanelContext } from "../../context/AdminPanelContext";

type ReleaseNote = {
  id: string;
  text: string;
  version: string;
  publishDate: string;
};

async function deleteReleaseNote(id: string, tenant: TenantID): Promise<void> {
  await axios.delete(`/api/admin/release-notes/${id}`, {
    headers: {
      "X-Tenant-Id": tenant,
    },
  });
}

async function fetchReleaseNotes(page: number, size: number, tenant: TenantID) {
  const response = await axios.get("/api/admin/release-notes", {
    params: {
      page,
      size,
    },
    headers: {
      "X-Tenant-Id": tenant,
    },
  });
  return response.data as Paginated<ReleaseNote>;
}

async function fetchReleaseNote(
  id: string,
  tenant: TenantID,
): Promise<ReleaseNote> {
  const response = await axios.get(`/api/admin/release-notes/${id}`, {
    headers: {
      "X-Tenant-Id": tenant,
    },
  });
  return response.data as ReleaseNote;
}

async function createReleaseNote(
  request: Pick<ReleaseNote, "text" | "version" | "publishDate">,
  tenant: TenantID,
) {
  return await axios.post(`/api/admin/release-notes/`, request, {
    headers: {
      "X-Tenant-Id": tenant,
    },
  });
}

async function updateReleaseNote(
  releaseNoteId: string,
  request: Pick<ReleaseNote, "text" | "version" | "publishDate">,
  tenant: TenantID,
) {
  return await axios.post(
    `/api/admin/release-notes/${releaseNoteId}`,
    request,
    {
      headers: {
        "X-Tenant-Id": tenant,
      },
    },
  );
}

export function ReleaseNotesContent() {
  const { tenantId: ctxTenantId } = useAdminPanelContext();
  const [selectedNoteId, setSelectedNoteId] = useState<string>();
  const [tenant, setTenant] = useState<TenantID | undefined>(ctxTenantId);
  const [showDialog, setShowDialog] = useState(false);
  const [cacheKey, setCacheKey] = useState(String(new Date()));

  const selectedReleaseNoteQ = useQuery({
    queryKey: ["release-note", selectedNoteId],
    queryFn:
      !!selectedNoteId && !!tenant
        ? () => fetchReleaseNote(selectedNoteId, tenant)
        : skipToken,
    placeholderData: keepPreviousData,
  });

  const isLoading =
    selectedReleaseNoteQ.isFetching && !selectedReleaseNoteQ.isPaused;

  const closeEditor = useCallback(() => {
    setSelectedNoteId(undefined);
    setShowDialog(false);
    setCacheKey(String(new Date()));
  }, []);

  return (
    <>
      <div
        className="p-3"
        style={{
          pointerEvents: isLoading ? "none" : undefined,
        }}
      >
        <div className="mb-3">
          <TenantPicker value={tenant} onChange={setTenant} />
        </div>
        {!tenant ? (
          <div className="text-muted">
            Select a tenant to view release notes.
          </div>
        ) : (
          <>
            <Button onClick={() => setShowDialog(true)}>
              Create release note
            </Button>
            <ReleaseNoteEditor
              releaseNoteId={selectedNoteId}
              tenant={tenant}
              showDialog={showDialog}
              selectedReleaseNoteQ={selectedReleaseNoteQ}
              onClose={closeEditor}
              onSave={closeEditor}
            />

            <PaginatedView<ReleaseNote>
              searchable={false}
              queryFn={(page, size) => fetchReleaseNotes(page, size, tenant)}
              queryKey={[tenant, "release-notes", cacheKey]}
            >
              {({ items }) =>
                items.length == 0 ? (
                  "no release notes"
                ) : (
                  <Table striped bordered hover className="mt-3">
                    <thead>
                      <tr>
                        <th>Version</th>
                        <th>Text</th>
                        <th>Date</th>
                        <th style={{ width: "10%" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((releaseNote) => (
                        <tr key={releaseNote.id}>
                          <td
                            className="pointer"
                            onClick={() => setSelectedNoteId(releaseNote.id)}
                          >
                            {releaseNote.version}
                          </td>
                          <td
                            className="pointer"
                            title={releaseNote.text}
                            onClick={() => setSelectedNoteId(releaseNote.id)}
                          >
                            {truncate(releaseNote.text, { length: 30 })}
                          </td>
                          <td
                            className="pointer"
                            onClick={() => setSelectedNoteId(releaseNote.id)}
                          >
                            {DateTime.fromISO(
                              releaseNote.publishDate,
                            ).toLocaleString(DateTime.DATETIME_SHORT)}
                          </td>
                          <td className="d-flex">
                            <AsyncSpinnerButton
                              variant="outline-danger"
                              onClick={() => {
                                deleteReleaseNote(releaseNote.id, tenant).then(
                                  () => setCacheKey(String(new Date())),
                                );
                              }}
                              size="sm"
                            >
                              <Trash className="d-flex align-items-center" />
                            </AsyncSpinnerButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )
              }
            </PaginatedView>
          </>
        )}
      </div>
    </>
  );
}

function ReleaseNoteEditor({
  releaseNoteId,
  tenant,
  showDialog,
  selectedReleaseNoteQ,
  onClose,
  onSave,
}: {
  releaseNoteId: string | undefined;
  tenant: TenantID;
  showDialog: boolean;
  selectedReleaseNoteQ: ReturnType<typeof useQuery<ReleaseNote>>;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Formik
      initialValues={
        isNil(releaseNoteId)
          ? { text: "", version: "", publishDate: "" }
          : selectedReleaseNoteQ.data!
      }
      enableReinitialize={true}
      validate={(values) => {
        const errors = {} as ReleaseNote;
        const pattern = /\d\d\.\d\d\.\d\d$/;
        if (!pattern.test(values.version)) {
          errors.version = "Version must be in the form yy.mm.dd";
        }
        if (isEmpty(values.text)) {
          errors.text = "Required";
        }
        if (isNil(values.publishDate)) {
          errors.publishDate = "Required";
        }
        return errors;
      }}
      onSubmit={async (values) => {
        const body = {
          text: values.text,
          version: values.version,
          publishDate: values.publishDate,
        };
        if (isNil(releaseNoteId)) {
          try {
            await createReleaseNote(body, tenant);
          } catch (e) {
            if (isAxiosError(e) && e.response) {
              console.error(e);
              alert(e.response.data.message);
              return;
            }
          }
        } else {
          await updateReleaseNote(releaseNoteId, body, tenant);
        }
        onSave();
      }}
    >
      {({ isSubmitting, submitForm, values }) => (
        <Modal
          show={showDialog || !!releaseNoteId}
          onHide={onClose}
          keyboard={false}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {isNil(releaseNoteId) ? "Create" : "Edit"} Release Note
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Container fluid="md">
              <Form>
                <Form.Group className="mt-3 mb-3" controlId="version">
                  <Form.Label className="fw-bold me-3">Version</Form.Label>
                  <BootstrapField name="version" placeholder="yy.mm.dd" />
                  <ErrorMessage
                    name="version"
                    component="div"
                    className="text-danger"
                  />
                </Form.Group>
                <Tabs defaultActiveKey="text" className="mb-3">
                  <Tab eventKey="text" title="Text">
                    <Form.Group className="mt-3 mb-3" controlId="text">
                      <BootstrapField
                        name="text"
                        as="textarea"
                        rows={4}
                        placeholder="* Body of the release note"
                      />
                      <ErrorMessage
                        name="text"
                        component="div"
                        className="text-danger"
                      />
                    </Form.Group>
                  </Tab>
                  <Tab eventKey="preview" title="Preview">
                    <div className="border rounded-1 p-2">
                      <h3 className="fa-lg mb-4 mt-2">
                        Version {values?.version || "00.00.00"}
                      </h3>
                      <div
                        className="markdown-content-container"
                        dangerouslySetInnerHTML={
                          values &&
                          sanitizedHtml(
                            marked.parse(values.text, { async: false }),
                          )
                        }
                      ></div>
                    </div>
                  </Tab>
                </Tabs>
                <Form.Group className="mt-3 mb-3" controlId="publishDate">
                  <Form.Label className="fw-bold me-3">Publish Date</Form.Label>
                  <Col sm={4}>
                    <DatePickerField name="publishDate" />
                  </Col>
                  <ErrorMessage
                    name="publishDate"
                    component="div"
                    className="text-danger"
                  />
                </Form.Group>
              </Form>
            </Container>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="primary"
              type="submit"
              onClick={() => submitForm()}
              disabled={isSubmitting}
            >
              Save
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </Formik>
  );
}

export function ReleaseNotesPage() {
  const { releaseNoteId } = useParams();
  const tenant = deriveTenantId() as TenantID;
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [cacheKey, setCacheKey] = useState(String(new Date()));

  const selectedReleaseNoteQ = useQuery({
    queryKey: ["release-note", releaseNoteId],
    queryFn: !!releaseNoteId
      ? () => fetchReleaseNote(releaseNoteId, tenant)
      : skipToken,
    placeholderData: keepPreviousData,
  });

  const isLoading =
    selectedReleaseNoteQ.isFetching && !selectedReleaseNoteQ.isPaused;

  const closeEditor = useCallback(() => {
    if (releaseNoteId) {
      navigate("/admin/release-notes/");
    }
    setShowDialog(false);
    setCacheKey(String(new Date()));
  }, [releaseNoteId, navigate]);

  return (
    <Container fluid="md">
      <Header />
      <main role="main">
        <div
          className="p-3"
          style={{
            pointerEvents: isLoading ? "none" : undefined,
          }}
        >
          <Button onClick={() => setShowDialog(true)}>
            Create release note
          </Button>
          <ReleaseNoteEditor
            releaseNoteId={releaseNoteId}
            tenant={tenant}
            showDialog={showDialog}
            selectedReleaseNoteQ={selectedReleaseNoteQ}
            onClose={closeEditor}
            onSave={closeEditor}
          />

          <PaginatedView<ReleaseNote>
            searchable={false}
            queryFn={(page, size) => fetchReleaseNotes(page, size, tenant)}
            queryKey={[tenant, "release-notes", cacheKey]}
          >
            {({ items }) =>
              items.length == 0 ? (
                "no release notes"
              ) : (
                <Table striped bordered hover className="mt-3">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Text</th>
                      <th>Date</th>
                      <th style={{ width: "10%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((releaseNote) => (
                      <tr key={releaseNote.id}>
                        <td
                          className="pointer"
                          onClick={() =>
                            navigate(`/admin/release-notes/${releaseNote.id}`)
                          }
                        >
                          {releaseNote.version}
                        </td>
                        <td
                          className="pointer"
                          title={releaseNote.text}
                          onClick={() =>
                            navigate(`/admin/release-notes/${releaseNote.id}`)
                          }
                        >
                          {truncate(releaseNote.text, { length: 30 })}
                        </td>
                        <td
                          className="pointer"
                          onClick={() =>
                            navigate(`/admin/release-notes/${releaseNote.id}`)
                          }
                        >
                          {DateTime.fromISO(
                            releaseNote.publishDate,
                          ).toLocaleString(DateTime.DATETIME_SHORT)}
                        </td>
                        <td className="d-flex">
                          <AsyncSpinnerButton
                            variant="outline-danger"
                            onClick={() => {
                              deleteReleaseNote(releaseNote.id, tenant).then(
                                () => setCacheKey(String(new Date())),
                              );
                            }}
                            size="sm"
                          >
                            <Trash className="d-flex align-items-center" />
                          </AsyncSpinnerButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )
            }
          </PaginatedView>
        </div>
      </main>
    </Container>
  );
}
