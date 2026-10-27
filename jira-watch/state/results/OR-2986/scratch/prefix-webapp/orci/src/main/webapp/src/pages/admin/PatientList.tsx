import "../../App.scss";
import { Button, Container, Form, InputGroup, Table } from "react-bootstrap";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { PaginatedView } from "../../components/Admin/PaginatedView";
import { toPaginated } from "../../types/Paginated";
import { PatientController } from "@api";
import type { PatientDto } from "@api";
import { PatientUUID, TenantID } from "../../types/identifiers";
import { deriveTenantId } from "../../utils/tenant";
import { useNavigate } from "react-router-dom";

type SortField = "pmrn" | "lastName" | "dob";

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

function sortIndicator(
  field: SortField,
  sort: string | undefined,
): string | null {
  if (sort === field) return " ▲";
  if (sort === `-${field}`) return " ▼";
  return null;
}

function PatientList() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main" className="admin-main">
        <div className="mb-2">
          <small className="mb-2">Patients</small>
        </div>

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
              <InputGroup className="mb-3" style={{ maxWidth: "400px" }}>
                <InputGroup.Text>Search</InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="PMRN, MRN, or name"
                  value={searchParams}
                  onChange={(e) => setSearchParams(e.target.value)}
                />
              </InputGroup>

              <PatientTable
                patients={items}
                sort={sort}
                onSort={(field) => setSort(toggleSort(sort, field))}
              />
            </>
          )}
        </PaginatedView>
      </main>
      <Footer />
    </Container>
  );
}

function PatientTable({
  patients,
  sort,
  onSort,
}: {
  patients: PatientDto[];
  sort: string | undefined;
  onSort: (field: SortField) => void;
}) {
  const navigate = useNavigate();
  const tenantId = deriveTenantId() as TenantID;

  function handleClick(id: PatientUUID) {
    navigate(`/admin/patients/${id}?client_id=${tenantId}`);
  }

  const sortableHeaderStyle = {
    cursor: "pointer",
    userSelect: "none" as const,
  };

  return (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th onClick={() => onSort("pmrn")} style={sortableHeaderStyle}>
            PMRN{sortIndicator("pmrn", sort)}
          </th>
          <th onClick={() => onSort("lastName")} style={sortableHeaderStyle}>
            Patient Name{sortIndicator("lastName", sort)}
          </th>
          <th onClick={() => onSort("dob")} style={sortableHeaderStyle}>
            DOB{sortIndicator("dob", sort)}
          </th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {patients.map((patient) => (
          <tr key={patient.id}>
            <td>{patient.pmrn}</td>
            <td>{patient.fullName}</td>
            <td>{patient.dob}</td>
            <td>
              <Button onClick={() => handleClick(patient.id)}>View</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default PatientList;
