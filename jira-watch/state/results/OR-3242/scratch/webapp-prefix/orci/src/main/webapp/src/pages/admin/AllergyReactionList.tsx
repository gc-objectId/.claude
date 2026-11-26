import "../../App.scss";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { AdminTable } from "../../components/Admin/AdminTable";
import { TenantScope } from "../../components/Admin/TenantScope";
import { useEffect, useMemo, useState } from "react";
import { Alert, Form, Spinner } from "react-bootstrap";

import { TenantID } from "../../types/identifiers";
import { AllergyReaction, AllergyReactionsController } from "@api";
import { useAdminPanelContext } from "../../context/AdminPanelContext";

export function AllergyReactionListContent() {
  const { tenantId: ctxTenantId } = useAdminPanelContext();
  const [reactions, setReactions] = useState<AllergyReaction[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantID | undefined>(
    ctxTenantId,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);

  const changeTenant = (tenantId: TenantID) => {
    setSelectedTenant(tenantId);
    setSelectedSeverity(null);
  };

  useEffect(() => {
    if (selectedTenant) {
      getReactions(selectedTenant);
    }
  }, [selectedTenant]);

  const getReactions = async function (tenantId: TenantID) {
    setIsLoading(true);
    try {
      const response = await AllergyReactionsController.getReactions({
        headers: {
          "X-Tenant-Id": tenantId,
        },
      });

      if (response.data) {
        setReactions(response.data);
        setError(null);
      } else {
        setReactions([]);
        setError("No reactions returned for this tenant.");
      }
    } catch (error) {
      console.error("Error fetching allergy reactions", error);
      setError("Failed to load allergy reactions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const severityOptions = useMemo(
    () => [...new Set(reactions.map((reaction) => reaction.severity))].sort(),
    [reactions],
  );

  return (
    <>
      <AdminPageHeader
        title="Allergy Reactions"
        meta="The reaction vocabulary a tenant's allergy records are mapped onto, with the severity each carries."
      />
      <div className="admin-toolbar">
        <TenantScope value={selectedTenant} onChange={changeTenant} />
        {selectedTenant && !isLoading && (
          <Form.Group controlId="severity-filter" className="admin-scope">
            <Form.Label className="guided-eyebrow">Severity</Form.Label>
            <Form.Select
              className="admin-toolbar__filter"
              value={selectedSeverity ?? ""}
              onChange={(e) => setSelectedSeverity(e.currentTarget.value)}
            >
              <option value="">All severities</option>
              {severityOptions.map((severity) => (
                <option key={severity}>{severity}</option>
              ))}
            </Form.Select>
          </Form.Group>
        )}
      </div>

      {!selectedTenant ? (
        <div className="admin-empty">
          Select a tenant to see its allergy reactions.
        </div>
      ) : isLoading ? (
        <div className="admin-empty">
          <Spinner size="sm" aria-hidden="true" />
          Loading reactions…
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <AllergyReactionTable
          reactions={reactions}
          severity={selectedSeverity}
        />
      )}
    </>
  );
}

function AllergyReactionList() {
  return (
    <AdminPage>
      <AllergyReactionListContent />
    </AdminPage>
  );
}

function AllergyReactionTable({
  reactions,
  severity,
}: {
  reactions: AllergyReaction[];
  severity: string | null;
}) {
  const filteredReactions = useMemo(
    () =>
      reactions.filter((reaction) => {
        if (severity === null || severity === "") return true;
        return reaction.severity === severity;
      }),
    [reactions, severity],
  );

  return (
    <AdminTable>
      <thead>
        <tr>
          <th>Reaction</th>
          <th>Severity</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>
        {filteredReactions.length === 0 ? (
          <tr>
            <td colSpan={3} className="admin-table__empty">
              {severity
                ? "No reactions with this severity."
                : "No reactions for this tenant."}
            </td>
          </tr>
        ) : (
          filteredReactions.map((reaction) => (
            <tr key={reaction.id}>
              <td>{reaction.reaction}</td>
              <td>
                <span className="guided-tag">{reaction.severity}</span>
              </td>
              <td className="admin-table__id">{reaction.id}</td>
            </tr>
          ))
        )}
      </tbody>
    </AdminTable>
  );
}

export default AllergyReactionList;
