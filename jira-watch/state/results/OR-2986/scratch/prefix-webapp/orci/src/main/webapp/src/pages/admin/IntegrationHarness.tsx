import "../../App.scss";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from "react-bootstrap";
import Header from "../../components/Header";
import { IntegrationHarnessController } from "@api/sdk.gen";
import { CommandDescriptor, HarnessResult } from "@api/types.gen";

const TENANT_KEYS = ["mgb-mgh", "mgb-icsnh", "demo-demo", "mayo-mayo"] as const;

function IntegrationHarnessContent() {
  const [commands, setCommands] = useState<CommandDescriptor[]>([]);
  const [tenantKey, setTenantKey] = useState<string>("");
  const [commandId, setCommandId] = useState<CommandDescriptor["id"] | "">("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
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
      <h1>Integration Harness</h1>
      <p className="text-muted">
        Invoke a client integration command directly to validate data parsing
        for a given tenant.
      </p>

      {fetchError && <Alert variant="danger">{fetchError}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Container>
          <Form.Group className="mt-3 mb-3" controlId="tenantKey">
            <Form.Label className="fw-bold me-3">Tenant:</Form.Label>
            <Form.Select
              style={{ width: "250px", display: "inline-block" }}
              value={tenantKey}
              onChange={(e) => {
                setTenantKey(e.target.value);
                setResult(null);
              }}
            >
              <option value="">— select tenant —</option>
              {TENANT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mt-3 mb-3" controlId="commandId">
            <Form.Label className="fw-bold me-3">Command:</Form.Label>
            <Form.Select
              style={{ width: "300px", display: "inline-block" }}
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
              className="mt-3 mb-3"
              controlId={input.name}
              key={input.name}
            >
              <Form.Label className="fw-bold me-3">{input.label}:</Form.Label>
              <Form.Control
                style={{ width: "300px", display: "inline-block" }}
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

          <Row className="mt-4">
            <Col md={{ span: 4, offset: 0 }}>
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
            </Col>
          </Row>

          {result && (
            <div className="mt-4">
              {result.success ? (
                <>
                  <h5 className="text-success">Success</h5>
                  <pre
                    style={{
                      background: "#f8f9fa",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      padding: "1rem",
                      maxHeight: "600px",
                      overflowY: "auto",
                      fontSize: "0.85rem",
                    }}
                  >
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </>
              ) : (
                <Alert variant="danger">
                  <strong>Error:</strong> {result.error}
                </Alert>
              )}
            </div>
          )}
        </Container>
      </Form>
    </>
  );
}

function IntegrationHarness() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main">
        <IntegrationHarnessContent />
      </main>
    </Container>
  );
}

export default IntegrationHarness;
