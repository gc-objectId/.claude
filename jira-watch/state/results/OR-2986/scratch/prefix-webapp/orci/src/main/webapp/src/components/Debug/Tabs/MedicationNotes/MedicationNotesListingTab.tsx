import {
  OverlayTrigger,
  Spinner,
  Stack,
  Table,
  Tooltip,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import BSForm from "react-bootstrap/Form";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { DateTime } from "luxon";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import React, { useCallback, useState } from "react";
import { PaginatedView } from "../../../Admin/PaginatedView";
import { toPaginated } from "../../../../types/Paginated";
import { AsyncSpinnerButton } from "../../../AsyncButton";
import { Search, Trash } from "react-bootstrap-icons";
import Select from "react-select";
import { CopyableIdentifier } from "../../CopyableIdentifier";
import { DosingInfo } from "./DosingInfo";
import { PatientController } from "@api";
import type { GetMedicationNotesData, MedicationNoteDto } from "@api";

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "INTENDED", label: "Intended" },
  { value: "UNKNOWN", label: "Unknown" },
];

export type MedicationNotesListingTab = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

export function MedicationNotesListingTab({
  context,
  isActive,
}: MedicationNotesListingTab) {
  const [cacheKey, setCacheKey] = useState(String(new Date()));

  const removeAllMedicationNotes = useCallback(async () => {
    await PatientController.deleteMedicationNotesForPatient({
      path: {
        patientId: context.patient.pmrn,
      },
    });
    setCacheKey(String(new Date()));
  }, [context.patient.pmrn]);

  if (!isActive) return <></>;
  return (
    <div>
      <div className="d-flex flex-row-reverse mb-3"></div>
      <PaginatedView<
        MedicationNoteDto,
        { name: string; status: string[]; category: string }
      >
        searchable={true}
        initialSearchParams={{
          name: "",
          status: [],
          category: "",
        }}
        queryFn={async (page, size, searchParams) => {
          const { data, error } = await PatientController.getMedicationNotes({
            path: {
              patientId: context.patient.pmrn,
              caseId: context.operation.caseId,
            },
            query: {
              page,
              size,
              medicationNameQuery: searchParams?.name,
              statusQuery:
                searchParams?.status as GetMedicationNotesData["query"]["statusQuery"],
              categoryQuery: searchParams?.category,
            },
          });
          if (!data) {
            throw new Error(
              (error as { message?: string })?.message ??
                "Unable to load medication notes.",
            );
          }
          return toPaginated(data, page, size);
        }}
        queryKey={[context.patient.pmrn, "medication-notes", cacheKey]}
      >
        {({
          items: medicationNotes,
          setSearchParams,
          searchParams,
          loading,
        }) => (
          <div>
            <Stack direction="horizontal" gap={2}>
              <BSForm.Group className="mb-3">
                <BSForm.Label>
                  <Search /> Medication Name
                </BSForm.Label>
                <BSForm.Control
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, name: e.target.value })
                  }
                  value={searchParams.name}
                />
              </BSForm.Group>
              <BSForm.Group className="mb-3">
                <BSForm.Label>Status</BSForm.Label>
                <Select
                  options={statusOptions}
                  name="status"
                  isMulti={true}
                  onChange={(newValue) => {
                    setSearchParams({
                      ...searchParams,
                      status: newValue.map((it) => it.value),
                    });
                  }}
                />
              </BSForm.Group>
              <BSForm.Group className="mb-3">
                <BSForm.Label>Category</BSForm.Label>
                <BSForm.Control
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      category: e.target.value,
                    })
                  }
                  value={searchParams.category}
                  placeholder="e.g. inpatient, outpatient"
                />
              </BSForm.Group>
              {loading && <Spinner />}
              <OverlayTrigger
                overlay={
                  <Tooltip>
                    <small>
                      Deletes all medication notes for the patient.
                      {(searchParams.name.length !== 0 ||
                        searchParams.status.length !== 0 ||
                        searchParams.category !== "") &&
                        " Deletion does not currently respect the filter, and so it is disabled for safety if a filter is specified."}
                    </small>
                  </Tooltip>
                }
              >
                <div className="ms-auto">
                  <AsyncSpinnerButton
                    variant="danger"
                    disabled={
                      searchParams.name.length !== 0 ||
                      searchParams.status.length !== 0 ||
                      searchParams.category !== ""
                    }
                    className="mb-3"
                    onClick={async () => {
                      await removeAllMedicationNotes();
                      setCacheKey(String(new Date()));
                    }}
                  >
                    <FontAwesomeIcon icon={faTrash} /> <span>Delete All</span>
                  </AsyncSpinnerButton>
                </div>
              </OverlayTrigger>
            </Stack>
            Count: {medicationNotes.length}
            <Table striped bordered hover id="medication-notes">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Order ID</th>
                  <th>Medication</th>
                  <th>Codings</th>
                  <th>Effective Period (start - end)</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Was Not Taken</th>
                  <th>Source</th>
                  <th>Dose Info</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {medicationNotes.map((note, index) => {
                  var startDate = note.effectiveStartDate
                    ? DateTime.fromISO(note.effectiveStartDate).toLocaleString(
                        DateTime.DATETIME_SHORT,
                      )
                    : "--";
                  var endDate = note.effectiveEndDate
                    ? DateTime.fromISO(note.effectiveEndDate).toLocaleString(
                        DateTime.DATETIME_SHORT,
                      )
                    : "--";
                  return (
                    <tr key={note.id + "-" + index}>
                      <td>
                        <OverlayTrigger
                          overlay={
                            <Tooltip>
                              Created:{" "}
                              {DateTime.fromISO(
                                note.createdDate ?? "",
                              ).toLocaleString(DateTime.DATETIME_SHORT)}
                              <br />
                              Last Updated:{" "}
                              {DateTime.fromISO(
                                note.lastModifiedDate ?? "",
                              ).toLocaleString(DateTime.DATETIME_SHORT)}
                            </Tooltip>
                          }
                        >
                          <span>
                            <CopyableIdentifier value={note.id} />
                          </span>
                        </OverlayTrigger>
                      </td>
                      <td>{note.orderId}</td>
                      <td>{note.medicationName}</td>
                      <td>
                        <ul>
                          {(note.codings ?? []).map((coding) => {
                            return (
                              <li key={coding.code}>
                                {coding.code} - {coding.codeSystem}
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td>{startDate + " — " + endDate}</td>
                      <td>{note.route}</td>
                      <td>{note.status}</td>
                      <td>{note.category}</td>
                      <td>{note.wasNotTaken ? "true" : "false"}</td>
                      <td>{note.source}</td>
                      <td>
                        <DosingInfo note={note} />
                      </td>
                      <td>
                        <AsyncSpinnerButton
                          variant="outline-danger"
                          disabled={!note.id}
                          onClick={async () => {
                            if (!note.id) return;
                            await PatientController.deleteMedicationNote({
                              path: {
                                medicationNoteId: note.id,
                              },
                            });
                            setCacheKey(String(new Date()));
                          }}
                          size="sm"
                        >
                          <Trash className="d-flex align-items-center" />
                        </AsyncSpinnerButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </PaginatedView>
    </div>
  );
}
