import "../../App.scss";
import { useEffect, useMemo, useState } from "react";
import Form from "react-bootstrap/Form";
import { Container, Table } from "react-bootstrap";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { TenantPicker } from "../../components/Admin/TenantPicker";
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

  return (
    <>
      <h1>Allergy Reactions</h1>
      <div className="mb-3">
        <label className="form-label">Select Tenant:</label>
        <TenantPicker value={selectedTenant} onChange={setSelectedTenant} />
      </div>

      {!selectedTenant && (
        <div className="alert alert-info">
          Please select a tenant to view allergy reactions.
        </div>
      )}
      {selectedTenant && error && (
        <div className="alert alert-danger">{error}</div>
      )}
      {selectedTenant && isLoading && <div>Loading reactions...</div>}
      {selectedTenant && !isLoading && (
        <AllergyReactionTable reactions={reactions} />
      )}
    </>
  );
}

function AllergyReactionList() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main" style={{ marginBottom: "100px", marginTop: "125px" }}>
        <AllergyReactionListContent />
      </main>
      <Footer />
    </Container>
  );
}

function AllergyReactionTable({ reactions }: { reactions: AllergyReaction[] }) {
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);

  const severityOptions = useMemo(
    () => [...new Set(reactions.map((reaction) => reaction.severity))].sort(),
    [reactions],
  );

  const filteredReactions = useMemo(
    () =>
      reactions.filter((reaction) => {
        if (selectedSeverity === null || selectedSeverity === "") return true;
        return reaction.severity === selectedSeverity;
      }),
    [reactions, selectedSeverity],
  );

  return (
    <div>
      <Form.Group style={{ maxWidth: "200px" }} className="mb-3">
        <Form.Label>Severity:</Form.Label>
        <Form.Select
          onChange={(e) => setSelectedSeverity(e.currentTarget.value)}
        >
          <option></option>
          {severityOptions.map((severity) => (
            <option key={severity}>{severity}</option>
          ))}
        </Form.Select>
      </Form.Group>

      <Table striped hover bordered size="sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Reaction</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          {filteredReactions.map((reaction) => (
            <tr key={reaction.id}>
              <td>{reaction.id}</td>
              <td>{reaction.reaction}</td>
              <td>{reaction.severity}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default AllergyReactionList;
