import { useTenantId } from "../../../context/TenantContext";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Alert, Spinner } from "react-bootstrap";
import { CitationDefinition } from "../../../types/CitationDefinition";
import { AdminTable } from "../AdminTable";

export function CitationsTab({ isActive }: { isActive: boolean }) {
  const tenantId = useTenantId();

  const citationsQ = useQuery({
    queryKey: ["citation-definitions", tenantId],
    queryFn: () =>
      axios.get(`/api/admin/citation-definitions`, {
        headers: {
          "X-Tenant-Id": tenantId,
        },
      }),
    enabled: isActive,
  });

  if (citationsQ.status === "pending") {
    return (
      <div className="admin-empty">
        <Spinner size="sm" aria-hidden="true" />
        Loading citations…
      </div>
    );
  }
  if (citationsQ.status === "error") {
    return (
      <Alert variant="danger">
        Unable to load the citations.
        <pre className="mb-0 mt-2">{String(citationsQ.error)}</pre>
      </Alert>
    );
  }
  return <CitationsTable citationDefinitions={citationsQ.data.data} />;
}

function CitationsTable({
  citationDefinitions,
}: {
  citationDefinitions: CitationDefinition[];
}) {
  return (
    <AdminTable>
      <thead>
        <tr>
          <th>Label</th>
          <th>Citation</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>
        {citationDefinitions.map((citationDefinition) => {
          return (
            <tr key={citationDefinition.id}>
              <td>
                <a href={citationDefinition.url}>{citationDefinition.title}</a>
              </td>
              <td>{citationDefinition.text}</td>
              <td className="admin-table__id">{citationDefinition.id}</td>
            </tr>
          );
        })}
      </tbody>
    </AdminTable>
  );
}
