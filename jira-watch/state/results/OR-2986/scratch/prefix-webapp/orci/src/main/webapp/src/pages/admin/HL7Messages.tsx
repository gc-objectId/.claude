import "../../App.scss";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Tab,
  Table,
  Tabs,
} from "react-bootstrap";
import { ArrowClockwise, Calendar3, Clock } from "react-bootstrap-icons";
import { useQueryClient } from "@tanstack/react-query";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { TenantPicker } from "../../components/Admin/TenantPicker";
import { PaginatedView } from "../../components/Admin/PaginatedView";
import {
  HL7MessageDetailModal,
  statusVariant,
} from "../../components/Admin/HL7MessageView";
import { Paginated } from "../../types/Paginated";
import { TenantID } from "../../types/identifiers";
import { Hl7InboundMessageAdminController } from "@api";
import { formatHl7Segments, splitSegmentId } from "../../utils/hl7";
import {
  FLOWSHEET_OBSERVATIONS,
  hl7Now,
  ObservationRow,
  TEMPLATES,
  TemplateField,
} from "../../utils/hl7Templates";
import type {
  Hl7InboundMessageSummaryDto,
  PagedModelHl7InboundMessageSummaryDto,
} from "@api";

interface HL7Filters {
  patientId: string;
  messageControlId: string;
  messageType: string;
  from: string;
  to: string;
}

/** Format a Date as the local wall-clock value a datetime-local input expects (YYYY-MM-DDTHH:mm). */
function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Default the viewer to the last hour so it opens on recent traffic instead of the whole history. */
function lastHourFilters(): HL7Filters {
  return {
    patientId: "",
    messageControlId: "",
    messageType: "",
    from: toLocalDateTimeInput(new Date(Date.now() - 60 * 60 * 1000)),
    to: "",
  };
}

function toInstant(localDateTime: string): string | undefined {
  if (!localDateTime) return undefined;
  const parsed = new Date(localDateTime);
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function toPagedResult(
  response: PagedModelHl7InboundMessageSummaryDto,
): Paginated<Hl7InboundMessageSummaryDto> {
  return {
    content: response.content ?? [],
    page: {
      size: response.page?.size ?? 0,
      totalElements: response.page?.totalElements ?? 0,
      totalPages: response.page?.totalPages ?? 0,
      number: response.page?.number ?? 0,
    },
  };
}

async function fetchMessages(
  page: number,
  size: number,
  filters: HL7Filters,
  tenantId: string,
): Promise<Paginated<Hl7InboundMessageSummaryDto>> {
  const { data } = await Hl7InboundMessageAdminController.getMessages({
    query: {
      page,
      size,
      ...(filters.patientId ? { patientId: filters.patientId } : {}),
      ...(filters.messageControlId
        ? { messageControlId: filters.messageControlId }
        : {}),
      ...(filters.messageType ? { messageType: filters.messageType } : {}),
      ...(toInstant(filters.from) ? { from: toInstant(filters.from) } : {}),
      ...(toInstant(filters.to) ? { to: toInstant(filters.to) } : {}),
    },
    headers: { "X-Tenant-Id": tenantId },
    throwOnError: true,
  });
  return toPagedResult(data);
}

// ============================================================
// Inbound Messages tab
// ============================================================

function MessageTable({
  items,
  onSelect,
}: {
  items: Hl7InboundMessageSummaryDto[];
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return <div className="text-muted">No messages match these filters.</div>;
  }
  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Received</th>
          <th>Message Control ID</th>
          <th>Message Type</th>
          <th>Patient ID</th>
          <th>Raw Message</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((m) => (
          <tr
            key={m.id}
            role="button"
            onClick={() => m.id && onSelect(m.id)}
            title="View raw message"
          >
            <td>
              {m.createdDate ? new Date(m.createdDate).toLocaleString() : "—"}
            </td>
            <td>{m.messageControlId ?? "—"}</td>
            <td>{m.messageType ?? "—"}</td>
            <td>{m.patientId ?? "—"}</td>
            <td>
              <code className="small text-body-secondary">
                {m.rawMessagePreview ?? "—"}
              </code>
            </td>
            <td>
              {m.status && (
                <Badge bg={statusVariant(m.status)}>{m.status}</Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function FilterBar({
  filters,
  setFilters,
}: {
  filters: HL7Filters;
  setFilters: (f: HL7Filters) => void;
}) {
  const update = (patch: Partial<HL7Filters>) =>
    setFilters({ ...filters, ...patch });
  return (
    <div className="mb-3">
      <div className="d-flex flex-wrap gap-3 mb-2">
        <Form.Group controlId="hl7-from">
          <Form.Label className="mb-0 small text-muted">From</Form.Label>
          <Form.Control
            type="datetime-local"
            size="sm"
            value={filters.from}
            onChange={(e) => update({ from: e.target.value })}
          />
        </Form.Group>
        <Form.Group controlId="hl7-to">
          <Form.Label className="mb-0 small text-muted">To</Form.Label>
          <Form.Control
            type="datetime-local"
            size="sm"
            value={filters.to}
            onChange={(e) => update({ to: e.target.value })}
          />
        </Form.Group>
      </div>
      <div className="d-flex flex-wrap gap-3">
        <Form.Group controlId="hl7-mcid">
          <Form.Label className="mb-0 small text-muted">
            Message Control ID
          </Form.Label>
          <Form.Control
            type="text"
            size="sm"
            value={filters.messageControlId}
            onChange={(e) => update({ messageControlId: e.target.value })}
            placeholder="exact MSH-10"
          />
        </Form.Group>
        <Form.Group controlId="hl7-message-type">
          <Form.Label className="mb-0 small text-muted">
            Message Type
          </Form.Label>
          <Form.Control
            type="text"
            size="sm"
            value={filters.messageType}
            onChange={(e) => update({ messageType: e.target.value })}
            placeholder="e.g. ORU"
          />
        </Form.Group>
        <Form.Group controlId="hl7-patient-id">
          <Form.Label className="mb-0 small text-muted">Patient ID</Form.Label>
          <Form.Control
            type="text"
            size="sm"
            value={filters.patientId}
            onChange={(e) => update({ patientId: e.target.value })}
            placeholder="e.g. 12345"
          />
        </Form.Group>
      </div>
    </div>
  );
}

function InboundMessagesTab({
  tenantId,
  isActive,
  onEditAndResend,
}: {
  tenantId: TenantID;
  isActive: boolean;
  onEditAndResend: (rawMessage: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  // Computed once at mount so the initial window doesn't drift on re-render.
  const [initialFilters] = useState(lastHourFilters);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: ["hl7-inbound-messages", tenantId],
      });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, tenantId]);

  useEffect(() => {
    if (isActive) handleRefresh();
    // Only trigger on tab activation, not on every handleRefresh identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return (
    <>
      <PaginatedView<Hl7InboundMessageSummaryDto, HL7Filters>
        searchable={true}
        initialSearchParams={initialFilters}
        queryKey={["hl7-inbound-messages", tenantId]}
        defaultPageSize={25}
        pageSizeOptions={[25, 50, 100]}
        queryFn={(page, size, filters) =>
          fetchMessages(page, size, filters, tenantId)
        }
      >
        {({ items, setSearchParams, searchParams }) => (
          <div>
            <div className="d-flex justify-content-between align-items-end gap-3">
              <FilterBar filters={searchParams} setFilters={setSearchParams} />
              <Button
                variant="outline-secondary"
                size="sm"
                className="mb-3"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Reload the latest messages"
              >
                <ArrowClockwise className={refreshing ? "spin me-1" : "me-1"} />
                Refresh
              </Button>
            </div>
            <MessageTable items={items} onSelect={setSelectedId} />
          </div>
        )}
      </PaginatedView>

      <HL7MessageDetailModal
        messageId={selectedId}
        tenantId={tenantId}
        onHide={() => setSelectedId(null)}
        onEditAndResend={onEditAndResend}
      />
    </>
  );
}

// ============================================================
// Send Message tab
// ============================================================

/** Renders a raw HL7 payload with each segment on its own line, segment ID bolded. */
function Hl7Payload({ raw }: { raw: string }) {
  const segments = formatHl7Segments(raw);
  if (segments.length === 0) return <span className="text-muted">Empty</span>;
  return (
    <pre
      className="bg-body-tertiary border rounded p-2 mb-0"
      style={{ overflowX: "auto", whiteSpace: "pre", fontSize: "0.85rem" }}
    >
      {segments.map((segment, i) => {
        const { id, rest } = splitSegmentId(segment);
        return (
          <div key={i}>
            <strong>{id}</strong>
            {rest}
          </div>
        );
      })}
    </pre>
  );
}

const CUSTOM_OBS_SENTINEL = "__custom__";

function isCustomRow(row: ObservationRow): boolean {
  return !FLOWSHEET_OBSERVATIONS.some((o) => o.code === row.code);
}

/** Editable list of OBX observations for the flowsheet template. */
function ObservationListField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  let rows: ObservationRow[] = [];
  try {
    rows = JSON.parse(value || "[]");
  } catch {
    // keep empty
  }

  const commit = (next: ObservationRow[]) => onChange(JSON.stringify(next));

  const addRow = () => {
    const first = FLOWSHEET_OBSERVATIONS[0];
    commit([...rows, { ...first, value: "" }]);
  };

  const removeRow = (i: number) => commit(rows.filter((_, idx) => idx !== i));

  const updateRow = (i: number, patch: Partial<ObservationRow>) =>
    commit(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleTypeChange = (i: number, code: string) => {
    if (code === CUSTOM_OBS_SENTINEL) {
      updateRow(i, { code: "", name: "", units: "" });
    } else {
      const known = FLOWSHEET_OBSERVATIONS.find((o) => o.code === code);
      if (known)
        updateRow(i, {
          code: known.code,
          name: known.name,
          units: known.units,
        });
    }
  };

  return (
    <div>
      {rows.length === 0 && (
        <div className="text-muted small mb-2">
          No observations — add one below.
        </div>
      )}
      {rows.map((row, i) => {
        const custom = isCustomRow(row);
        return (
          <div key={i} className="d-flex align-items-center gap-2 mb-2">
            <Form.Select
              size="sm"
              value={custom ? CUSTOM_OBS_SENTINEL : row.code}
              onChange={(e) => handleTypeChange(i, e.target.value)}
              style={{ maxWidth: "200px" }}
            >
              {FLOWSHEET_OBSERVATIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
              <option value={CUSTOM_OBS_SENTINEL}>Custom</option>
            </Form.Select>
            {custom && (
              <>
                <Form.Control
                  type="text"
                  size="sm"
                  value={row.code}
                  onChange={(e) => updateRow(i, { code: e.target.value })}
                  placeholder="code"
                  style={{ maxWidth: "90px" }}
                />
                <Form.Control
                  type="text"
                  size="sm"
                  value={row.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                  placeholder="name"
                  style={{ maxWidth: "120px" }}
                />
              </>
            )}
            <Form.Control
              type="text"
              size="sm"
              value={row.value}
              onChange={(e) => updateRow(i, { value: e.target.value })}
              placeholder="value"
              style={{ maxWidth: "80px" }}
            />
            {custom ? (
              <Form.Control
                type="text"
                size="sm"
                value={row.units}
                onChange={(e) => updateRow(i, { units: e.target.value })}
                placeholder="units"
                style={{ maxWidth: "70px" }}
              />
            ) : (
              <span className="text-muted small" style={{ minWidth: "50px" }}>
                {row.units}
              </span>
            )}
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => removeRow(i)}
              aria-label="Remove observation"
            >
              ×
            </Button>
          </div>
        );
      })}
      <Button variant="outline-secondary" size="sm" onClick={addRow}>
        + Add observation
      </Button>
    </div>
  );
}

/** Convert a datetime-local value (YYYY-MM-DDTHH:mm) to an HL7 timestamp (YYYYMMDDHHmmss). */
function datetimeLocalToHl7(value: string): string {
  return value.replace(/[-T:]/g, "").slice(0, 14).padEnd(14, "0");
}

/** Convert an HL7 timestamp (YYYYMMDDHHmmss) to a datetime-local value (YYYY-MM-DDTHH:mm). */
function hl7ToDatetimeLocal(hl7: string): string {
  if (hl7.length < 8) return "";
  const y = hl7.slice(0, 4);
  const mo = hl7.slice(4, 6);
  const d = hl7.slice(6, 8);
  const h = (hl7.slice(8, 10) || "00").padStart(2, "0");
  const mi = (hl7.slice(10, 12) || "00").padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

/** Popover with separate date + time inputs for HL7 timestamp fields. */
function TimestampPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const dtLocal = hl7ToDatetimeLocal(value);
  const datePart = dtLocal.slice(0, 10);
  const timePart = dtLocal.slice(11, 16) || "00:00";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleDate = (d: string) =>
    onChange(datetimeLocalToHl7(`${d}T${timePart}`));

  const handleTime = (t: string) => {
    const d = datePart || new Date().toISOString().slice(0, 10);
    onChange(datetimeLocalToHl7(`${d}T${t}`));
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <Button
        variant="link"
        size="sm"
        className="p-0 text-muted"
        style={{ lineHeight: 1 }}
        title="Pick date/time"
        onClick={() => setOpen((v) => !v)}
      >
        <Calendar3 size={13} />
      </Button>
      {open && (
        <div
          className="border rounded bg-body shadow-sm p-2"
          style={{
            position: "absolute",
            zIndex: 1000,
            top: "100%",
            left: 0,
            whiteSpace: "nowrap",
          }}
        >
          <div className="d-flex gap-2 align-items-center">
            <Form.Control
              type="date"
              size="sm"
              value={datePart}
              onChange={(e) => handleDate(e.target.value)}
            />
            <Form.Control
              type="time"
              size="sm"
              value={timePart}
              onChange={(e) => handleTime(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A single template form field — text input, select, or observation list. */
function TemplateFormField({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string;
  onChange: (value: string) => void;
}) {
  const invalid = field.required && !value.trim();

  return (
    <Form.Group>
      <div className="d-flex align-items-center gap-1 mb-1">
        <Form.Label className="mb-0 small text-muted">
          {field.label}
          {field.required && <span className="text-danger ms-1">*</span>}
        </Form.Label>
        {field.inputSubtype === "timestamp" && (
          <>
            <Button
              variant="link"
              size="sm"
              className="p-0 text-muted"
              style={{ lineHeight: 1 }}
              onClick={() => onChange(hl7Now())}
              title="Set to now"
            >
              <Clock size={13} />
            </Button>
            <TimestampPicker value={value} onChange={onChange} />
          </>
        )}
      </div>
      {field.type === "select" ? (
        <Form.Select
          size="sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Form.Select>
      ) : field.type === "observation-list" ? (
        <ObservationListField value={value} onChange={onChange} />
      ) : (
        <Form.Control
          type="text"
          size="sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          isInvalid={invalid}
        />
      )}
      {invalid && (
        <Form.Control.Feedback type="invalid">Required</Form.Control.Feedback>
      )}
    </Form.Group>
  );
}

/** Normalise line endings to bare CR as required by the HL7 v2 spec and HAPI parser. */
function normalizeHl7(message: string): string {
  return message.replace(/\r\n|\n/g, "\r");
}

/** Convert HL7 CR segment separators to newlines for textarea display. */
function hl7ToDisplayText(message: string): string {
  return message.replace(/\r/g, "\n");
}

const RAW_KEY = "raw";

function SendMessageTab({
  tenantId,
  resend,
}: {
  tenantId: TenantID;
  resend?: { raw: string; key: number };
}) {
  const [templateKey, setTemplateKey] = useState<string>(RAW_KEY);
  // Field values are preserved across template switches — shared by key name.
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [rawMessage, setRawMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    ack: string | null;
    error: string | null;
  } | null>(null);

  // When a message is forwarded from the inbound tab, switch to raw mode and populate it.
  useEffect(() => {
    if (resend) {
      setTemplateKey(RAW_KEY);
      setRawMessage(hl7ToDisplayText(resend.raw));
    }
    // key is a monotonic counter so the same message can be resent multiple times.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resend?.key]);

  const template = TEMPLATES.find((t) => t.key === templateKey);

  const handleTemplateChange = (newKey: string) => {
    setTemplateKey(newKey);
    const newTemplate = TEMPLATES.find((t) => t.key === newKey);
    if (newTemplate) {
      // Seed any fields not yet in state with their defaults.
      setFieldValues((prev) => {
        const next = { ...prev };
        for (const field of newTemplate.fields) {
          if (!(field.key in next)) {
            next[field.key] = field.defaultValue();
          }
        }
        return next;
      });
    }
  };

  const updateField = (key: string, value: string) =>
    setFieldValues((prev) => ({ ...prev, [key]: value }));

  const messageToSend = template
    ? normalizeHl7(template.build(fieldValues))
    : normalizeHl7(rawMessage);

  const requiredFieldsMet =
    !template ||
    template.fields.every((f) => !f.required || fieldValues[f.key]?.trim());
  const canSend = messageToSend.trim().length > 0 && requiredFieldsMet;

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const { data } = await Hl7InboundMessageAdminController.sendMessage({
        body: { rawMessage: messageToSend },
        headers: { "X-Tenant-Id": tenantId },
        throwOnError: true,
      });
      setResult({ ack: data.acknowledgement ?? null, error: null });
      // Auto-increment the message control ID for the next send.
      if (template?.fields.some((f) => f.key === "messageControlId")) {
        setFieldValues((prev) => {
          const n = parseInt(prev.messageControlId ?? "", 10);
          return isNaN(n) ? prev : { ...prev, messageControlId: String(n + 1) };
        });
      }
    } catch (e: unknown) {
      setResult({
        ack: null,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* Template selector */}
      <Form.Group className="mb-4" style={{ maxWidth: "320px" }}>
        <Form.Label className="mb-1 small text-muted">Template</Form.Label>
        <Form.Select
          value={templateKey}
          onChange={(e) => handleTemplateChange(e.target.value)}
        >
          <option value={RAW_KEY}>Raw Message</option>
          {TEMPLATES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {template ? (
        // ── Template mode: form fields + generated preview ──
        <>
          <Row className="g-3 mb-4">
            {template.fields.map((field) => (
              <Col
                key={field.key}
                xs={12}
                sm={field.type === "observation-list" ? 12 : 6}
              >
                <TemplateFormField
                  field={field}
                  value={fieldValues[field.key] ?? ""}
                  onChange={(v) => updateField(field.key, v)}
                />
              </Col>
            ))}
          </Row>

          <details className="mb-4">
            <summary className="small text-muted" style={{ cursor: "pointer" }}>
              Generated message preview
            </summary>
            <div className="mt-2">
              <Hl7Payload raw={messageToSend} />
            </div>
          </details>
        </>
      ) : (
        // ── Raw mode: editable textarea ──
        <Form.Group className="mb-4">
          <Form.Label className="mb-1 small text-muted">HL7 Message</Form.Label>
          <Form.Control
            as="textarea"
            rows={12}
            value={rawMessage}
            onChange={(e) => setRawMessage(e.target.value)}
            placeholder={"MSH|^~\\&|..."}
            style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
          />
        </Form.Group>
      )}

      <Button
        variant="primary"
        onClick={handleSend}
        disabled={sending || !canSend}
      >
        {sending ? (
          <>
            <Spinner animation="border" size="sm" className="me-1" />
            Sending…
          </>
        ) : (
          "Send"
        )}
      </Button>

      {result && (
        <div className="mt-4">
          {result.error ? (
            <Alert variant="danger">{result.error}</Alert>
          ) : result.ack ? (
            <>
              <div className="mb-2 fw-semibold">Acknowledgement</div>
              <Hl7Payload raw={result.ack} />
            </>
          ) : (
            <Alert variant="warning">
              Message could not be parsed; no acknowledgement returned.
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Page
// ============================================================

function HL7MessagesContent() {
  const [tenantId, setTenantId] = useState<TenantID | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("inbound");
  const [resend, setResend] = useState<{ raw: string; key: number }>();

  const handleEditAndResend = useCallback((rawMessage: string) => {
    setResend((prev) => ({ raw: rawMessage, key: (prev?.key ?? 0) + 1 }));
    setActiveTab("send");
  }, []);

  return (
    <>
      <h1 className="fs-4 mb-3">HL7 Messages</h1>
      <div style={{ maxWidth: "300px" }} className="mb-3">
        <Form.Label className="mb-1 small text-muted">Tenant</Form.Label>
        <TenantPicker value={tenantId} onChange={(t) => setTenantId(t)} />
      </div>

      {!tenantId ? (
        <div className="text-muted">Select a tenant to continue.</div>
      ) : (
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k ?? "inbound")}
          className="mb-3"
        >
          <Tab eventKey="inbound" title="Inbound Messages">
            <InboundMessagesTab
              tenantId={tenantId}
              isActive={activeTab === "inbound"}
              onEditAndResend={handleEditAndResend}
            />
          </Tab>
          <Tab eventKey="send" title="Send Message">
            <SendMessageTab tenantId={tenantId} resend={resend} />
          </Tab>
        </Tabs>
      )}
    </>
  );
}

function HL7Messages() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main" className="admin-main">
        <HL7MessagesContent />
      </main>
      <Footer />
    </Container>
  );
}

export default HL7Messages;
