import "../../App.scss";
import { Button, Form } from "react-bootstrap";
import { CaretDownFill, CaretUpFill } from "react-bootstrap-icons";
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { AdminTable } from "../../components/Admin/AdminTable";
import { PaginatedView } from "../../components/Admin/PaginatedView";
import { toPaginated } from "../../types/Paginated";
import { PatientController } from "@api";
import type { PatientDto } from "@api";
import { PatientUUID, TenantID } from "../../types/identifiers";
import { deriveTenantId } from "../../utils/tenant";

type SortField = "pmrn" | "lastName" | "dob";
type SortDirection = "asc" | "desc" | undefined;

async function fetchPatients(
  page: number,
  size: number,
  search: string,
  sort: string | undefined,
) {
  const { data, error } = await PatientController.getPatients({
    query: {
      page,
      size,
      search: search || undefined,
      sort,
    },
  });
  if (!data) {
    throw new Error(
      (error as { message?: string })?.message ?? "Unable to load patients.",
    );
  }
  return toPaginated(data, page, size);
}

/**
 * Toggle sort for a given field. First click sorts ascending, second click flips
 * to descending, third click clears. Sort strings use JSON:API convention:
 * "field" for ascending, "-field" for descending.
 */
function toggleSort(
  current: string | undefined,
  field: SortField,
): string | undefined {
  if (current === field) return `-${field}`;
  if (current === `-${field}`) return undefined;
  return field;
}

function sortDirection(
  field: SortField,
  sort: string | undefined,
): SortDirection {
  if (sort === field) return "asc";
  if (sort === `-${field}`) return "desc";
  return undefined;
}

function PatientList() {
  return (
    <AdminPage>
      <AdminPageHeader title="Patients" />

      <PaginatedView<PatientDto, string>
        queryKey={["admin-patients"]}
        searchable
        sortable
        initialSearchParams=""
        pageSizeOptions={[10, 25, 50, 100]}
        queryFn={fetchPatients}
      >
        {({ items, searchParams, setSearchParams, sort, setSort }) => (
          <>
            <div className="admin-toolbar">
              <Form.Control
                type="search"
                className="admin-toolbar__search"
                placeholder="PMRN, MRN, or name"
                aria-label="Search patients"
                value={searchParams}
                onChange={(e) => setSearchParams(e.target.value)}
              />
            </div>

            <PatientTable
              patients={items}
              searched={searchParams.trim() !== ""}
              sort={sort}
              onSort={(field) => setSort(toggleSort(sort, field))}
            />
          </>
        )}
      </PaginatedView>
    </AdminPage>
  );
}

function SortableHeader({
  field,
  sort,
  onSort,
  children,
}: {
  field: SortField;
  sort: string | undefined;
  onSort: (field: SortField) => void;
  children: ReactNode;
}) {
  const direction = sortDirection(field, sort);
  const ariaSort =
    direction === "asc"
      ? "ascending"
      : direction === "desc"
      ? "descending"
      : "none";
  return (
    <th aria-sort={ariaSort}>
      <button
        type="button"
        className="admin-table__sort"
        onClick={() => onSort(field)}
      >
        {children}
        {direction === "asc" && <CaretUpFill aria-hidden="true" />}
        {direction === "desc" && <CaretDownFill aria-hidden="true" />}
      </button>
    </th>
  );
}

function PatientTable({
  patients,
  searched,
  sort,
  onSort,
}: {
  patients: PatientDto[];
  searched: boolean;
  sort: string | undefined;
  onSort: (field: SortField) => void;
}) {
  const navigate = useNavigate();
  const tenantId = deriveTenantId() as TenantID;

  function handleClick(id: PatientUUID) {
    navigate(`/admin/patients/${id}?client_id=${tenantId}`);
  }

  return (
    <AdminTable>
      <thead>
        <tr>
          <SortableHeader field="pmrn" sort={sort} onSort={onSort}>
            PMRN
          </SortableHeader>
          <SortableHeader field="lastName" sort={sort} onSort={onSort}>
            Patient Name
          </SortableHeader>
          <SortableHeader field="dob" sort={sort} onSort={onSort}>
            DOB
          </SortableHeader>
          <th>
            <span className="visually-hidden">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {patients.length === 0 && (
          <tr>
            <td colSpan={4} className="admin-table__empty">
              {searched ? "No patients match this search." : "No patients yet."}
            </td>
          </tr>
        )}
        {patients.map((patient) => (
          <tr key={patient.id}>
            <td>{patient.pmrn}</td>
            <td>{patient.fullName}</td>
            <td>{patient.dob}</td>
            <td className="text-end">
              <Button size="sm" onClick={() => handleClick(patient.id)}>
                View
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}

export default PatientList;
