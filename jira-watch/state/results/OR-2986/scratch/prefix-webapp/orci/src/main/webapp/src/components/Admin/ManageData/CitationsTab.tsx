import { useTenantId } from "../../../context/TenantContext";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Spinner, Table } from "react-bootstrap";
import { CitationDefinition } from "../../../types/CitationDefinition";

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
    return <Spinner />;
  }
  if (citationsQ.status === "error") {
    return (
      <div>
        Error loading
        <pre>{String(citationsQ.error)}</pre>
      </div>
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
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>ID</th>
          <th>Label</th>
          <th>Citation</th>
        </tr>
      </thead>
      <tbody>
        {citationDefinitions.map((citationDefinition) => {
          return (
            <tr key={citationDefinition.id} className="align-middle">
              <td>{citationDefinition.id}</td>
              <td>
                <a href={citationDefinition.url}>{citationDefinition.title}</a>
              </td>
              <td>{citationDefinition.text}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
