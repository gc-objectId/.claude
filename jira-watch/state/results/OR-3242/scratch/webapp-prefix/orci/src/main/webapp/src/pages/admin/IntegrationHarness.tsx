import "../../App.scss";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { useEffect, useState } from "react";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import { IntegrationHarnessController } from "@api/sdk.gen";
import { CommandDescriptor, HarnessResult } from "@api/types.gen";
import { useAdminPanelContext } from "../../context/AdminPanelContext";
import { useTenantOptions } from "../../components/Admin/TenantPicker";

export function IntegrationHarnessContent() {
  const { tenantId: ctxTenantId, patientId: ctxPatientId } =
    useAdminPanelContext();
  const tenants = useTenantOptions();
  const [commands, setCommands] = useState<CommandDescriptor[]>([]);
  const [tenantKey, setTenantKey] = useState<string>(ctxTenantId ?? "");
  const [commandId, setCommandId] = useState<CommandDescriptor["id"] | "">("");
  const [inputValues, setInputValues] = useState<Record<string, string>>(
    ctxPatientId ? { pmrn: ctxPatientId } : {},
  );
  const [result, setResult] = useState<HarnessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    IntegrationHarnessController.getCommands()
      .then((r) => setCommands(r.data ?? []))
      .catch(() => setFetchError("Failed to load command catalog"));
  }, []);

  const selectedCommand = commands.find((c) => c.id === commandId);

  const handleCommandChange = (id: CommandDescriptor["id"]) => {
    setCommandId(id);
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantKey || !commandId) return;

    setLoading(true);
    setResult(null);
    try {
      const inputNames = new Set(
        selectedCommand?.inputs?.map((i) => i.name ?? "") ?? [],
      );
      const body = Object.fromEntries(
        Object.entries(inputValues).filter(([key]) => inputNames.has(key)),
      );
      const response = await IntegrationHarnessController.execute({
        path: { tenantKey, commandId },
        body,
        headers: { "X-Tenant-Id": tenantKey },
      });
      setResult(response.data ?? null);
    } catch {
      setResult({
        success: false,
        data: null,
        error: "Network error — check console",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Integration Harness"
        meta="Invoke a client integration command directly to validate data parsing for a given tenant."
      />

      {fetchError && <Alert variant="danger">{fetchError}</Alert>}

      <Form onSubmit={handleSubmit}>
        <div className="admin-filters">
          <Form.Group className="admin-field" controlId="tenantKey">
            <Form.Label className="guided-eyebrow">Tenant</Form.Label>
            <Form.Select
              value={tenantKey}
              onChange={(e) => {
                setTenantKey(e.target.value);
                setResult(null);
              }}
            >
              <option value="">— select tenant —</option>
              {tenants.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="admin-field" controlId="commandId">
            <Form.Label className="guided-eyebrow">Command</Form.Label>
            <Form.Select
              value={commandId}
              onChange={(e) =>
                handleCommandChange(e.target.value as CommandDescriptor["id"])
              }
              disabled={commands.length === 0}
            >
              <option value="">— select command —</option>
              {commands.map((cmd) => (
                <option key={cmd.id} value={cmd.id}>
                  {cmd.displayName}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {selectedCommand?.inputs?.map((input) => (
            <Form.Group
              className="admin-field"
              controlId={input.name}
              key={input.name}
            >
              <Form.Label className="guided-eyebrow">{input.label}</Form.Label>
              <Form.Control
                type="text"
                placeholder={input.placeholder}
                value={inputValues[input.name ?? ""] ?? ""}
                onChange={(e) =>
                  setInputValues((prev) => ({
                    ...prev,
                    [input.name ?? ""]: e.target.value,
                  }))
                }
              />
            </Form.Group>
          ))}

          <div className="admin-filters__actions">
            <Button
              type="submit"
              disabled={loading || !tenantKey || !commandId}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Running…
                </>
              ) : (
                "Run Command"
              )}
            </Button>
          </div>
        </div>

        {result &&
          (result.success ? (
            <div className="admin-detail">
              <p className="guided-eyebrow mb-0">Result</p>
              <pre className="admin-pre admin-pre--scrolling mt-2">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ) : (
            <Alert variant="danger">
              <strong>Error:</strong> {result.error}
            </Alert>
          ))}
      </Form>
    </>
  );
}

function IntegrationHarness() {
  return (
    <AdminPage>
      <IntegrationHarnessContent />
    </AdminPage>
  );
}

export default IntegrationHarness;
