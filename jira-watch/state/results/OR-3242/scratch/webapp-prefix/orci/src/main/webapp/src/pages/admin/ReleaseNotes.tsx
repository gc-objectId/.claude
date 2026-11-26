import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { AdminTable } from "../../components/Admin/AdminTable";
import { Button, Form, Modal, Tab, Tabs } from "react-bootstrap";
import axios, { isAxiosError } from "axios";
import { Paginated } from "../../types/Paginated";
import { useNavigate, useParams } from "react-router-dom";
import { MouseEvent, useCallback, useState } from "react";
import {
  keepPreviousData,
  skipToken,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import { CURRENT_RELEASE_NOTE_QUERY_KEY } from "../../components/ReleaseNoteViewer";

type ReleaseNote = {
  id: string;
  text: string;
  version: string;
  publishDate: string;
};

async function deleteReleaseNote(id: string): Promise<void> {
  await axios.delete(`/api/admin/release-notes/${id}`);
}

async function fetchReleaseNotes(page: number, size: number) {
  const response = await axios.get("/api/admin/release-notes", {
    params: {
      page,
      size,
    },
  });
  return response.data as Paginated<ReleaseNote>;
}

async function fetchReleaseNote(id: string): Promise<ReleaseNote> {
  const response = await axios.get(`/api/admin/release-notes/${id}`);
  return response.data as ReleaseNote;
}

async function createReleaseNote(
  request: Pick<ReleaseNote, "text" | "version" | "publishDate">,
) {
  return await axios.post(`/api/admin/release-notes/`, request);
}

async function updateReleaseNote(
  releaseNoteId: string,
  request: Pick<ReleaseNote, "text" | "version" | "publishDate">,
) {
  return await axios.post(`/api/admin/release-notes/${releaseNoteId}`, request);
}

function ReleaseNotesBody({
  releaseNoteId,
  onSelect,
  onClose,
}: {
  releaseNoteId: string | undefined;
  onSelect: (releaseNoteId: string) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);

  const selectedReleaseNoteQ = useQuery({
    queryKey: ["release-notes", "detail", releaseNoteId],
    queryFn: releaseNoteId ? () => fetchReleaseNote(releaseNoteId) : skipToken,
    placeholderData: keepPreviousData,
  });

  const isLoading =
    selectedReleaseNoteQ.isFetching && !selectedReleaseNoteQ.isPaused;

  const closeEditor = useCallback(() => {
    onClose();
    setShowDialog(false);
  }, [onClose]);

  const refreshReleaseNotes = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["release-notes"] }),
        queryClient.invalidateQueries({
          queryKey: CURRENT_RELEASE_NOTE_QUERY_KEY,
        }),
      ]),
    [queryClient],
  );

  const saveEditor = useCallback(async () => {
    await refreshReleaseNotes();
    closeEditor();
  }, [refreshReleaseNotes, closeEditor]);

  return (
    <div className={isLoading ? "admin-busy" : undefined}>
      <AdminPageHeader
        title="Release Notes"
        meta="What changed in each release, shown to users from the footer."
        actions={
          <Button onClick={() => setShowDialog(true)}>
            Create release note
          </Button>
        }
      />
      <ReleaseNoteEditor
        releaseNoteId={releaseNoteId}
        showDialog={showDialog}
        selectedReleaseNoteQ={selectedReleaseNoteQ}
        onClose={closeEditor}
        onSave={saveEditor}
      />

      <PaginatedView<ReleaseNote>
        searchable={false}
        queryFn={(page, size) => fetchReleaseNotes(page, size)}
        queryKey={["release-notes", "list"]}
      >
        {({ items }) => (
          <AdminTable className="admin-table--selectable">
            <thead>
              <tr>
                <th>Version</th>
                <th>Text</th>
                <th>Published</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="admin-table__empty">
                    No release notes yet.
                  </td>
                </tr>
              )}
              {items.map((releaseNote) => (
                <tr
                  key={releaseNote.id}
                  onClick={() => onSelect(releaseNote.id)}
                >
                  <td>
                    <strong>{releaseNote.version}</strong>
                  </td>
                  <td title={releaseNote.text}>
                    {truncate(releaseNote.text, { length: 80 })}
                  </td>
                  <td>
                    {DateTime.fromISO(releaseNote.publishDate).toLocaleString(
                      DateTime.DATETIME_SHORT,
                    )}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <AsyncSpinnerButton
                        variant="outline-danger"
                        size="sm"
                        className="admin-icon-button"
                        aria-label={`Delete release note ${releaseNote.version}`}
                        onClick={(event: MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          return deleteReleaseNote(releaseNote.id).then(
                            refreshReleaseNotes,
                          );
                        }}
                      >
                        <Trash aria-hidden="true" />
                      </AsyncSpinnerButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </PaginatedView>
    </div>
  );
}

function ReleaseNoteEditor({
  releaseNoteId,
  showDialog,
  selectedReleaseNoteQ,
  onClose,
  onSave,
}: {
  releaseNoteId: string | undefined;
  showDialog: boolean;
  selectedReleaseNoteQ: ReturnType<typeof useQuery<ReleaseNote>>;
  onClose: () => void;
  onSave: () => Promise<void>;
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
            await createReleaseNote(body);
          } catch (e) {
            if (isAxiosError(e) && e.response) {
              console.error(e);
              alert(e.response.data.message);
              return;
            }
          }
        } else {
          await updateReleaseNote(releaseNoteId, body);
        }
        await onSave();
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
            <Form>
              <Form.Group className="mb-3" controlId="version">
                <Form.Label>Version</Form.Label>
                <BootstrapField name="version" placeholder="yy.mm.dd" />
                <ErrorMessage
                  name="version"
                  component="div"
                  className="text-danger"
                />
              </Form.Group>
              <Tabs defaultActiveKey="text" className="admin-tabs mb-3">
                <Tab eventKey="text" title="Text">
                  <Form.Group className="mb-3" controlId="text">
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
                  <div className="admin-preview mb-3">
                    <h2 className="guided-section-title mb-2">
                      Version {values?.version || "00.00.00"}
                    </h2>
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
              <Form.Group className="mb-3" controlId="publishDate">
                <Form.Label>Publish Date</Form.Label>
                <DatePickerField name="publishDate" className="form-control" />
                <ErrorMessage
                  name="publishDate"
                  component="div"
                  className="text-danger"
                />
              </Form.Group>
            </Form>
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

export function ReleaseNotesContent() {
  const [selectedNoteId, setSelectedNoteId] = useState<string>();
  return (
    <ReleaseNotesBody
      releaseNoteId={selectedNoteId}
      onSelect={setSelectedNoteId}
      onClose={() => setSelectedNoteId(undefined)}
    />
  );
}

export function ReleaseNotesPage() {
  const { releaseNoteId } = useParams();
  const navigate = useNavigate();

  return (
    <AdminPage>
      <ReleaseNotesBody
        releaseNoteId={releaseNoteId}
        onSelect={(id) => navigate(`/admin/release-notes/${id}`)}
        onClose={() => {
          if (releaseNoteId) navigate("/admin/release-notes");
        }}
      />
    </AdminPage>
  );
}
