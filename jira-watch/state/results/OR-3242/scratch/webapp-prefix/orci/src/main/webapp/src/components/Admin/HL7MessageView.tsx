import { useState } from "react";
import { Alert, Badge, Button, Modal, Spinner } from "react-bootstrap";
import { useQuery } from "@tanstack/react-query";
import { Clipboard, ClipboardCheck } from "react-bootstrap-icons";
import { Hl7InboundMessageAdminController } from "@api";
import type { Hl7InboundMessageDetailDto } from "@api";
import { formatHl7Segments, splitSegmentId } from "../../utils/hl7";
import { Fact, FactList } from "./FactList";
import { SectionHeader } from "../SectionHeader";

export function statusVariant(status: string | undefined): string {
  switch (status) {
    case "ACCEPTED":
      return "success";
    case "REJECTED":
    case "ERROR":
      return "danger";
    default:
      return "secondary";
  }
}

/** Render a raw HL7 payload one segment per line, emphasizing each segment id. */
export function Hl7Payload({ raw }: { raw: string | undefined }) {
  const segments = formatHl7Segments(raw);
  if (segments.length === 0)
    return <span className="admin-section__lede">Empty</span>;
  return (
    <pre className="admin-pre">
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

function CopyButton({ text }: { text: string | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <Button
      variant="outline-primary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <ClipboardCheck aria-hidden="true" />
      ) : (
        <Clipboard aria-hidden="true" />
      )}{" "}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function HL7MessageDetailModal({
  messageId,
  tenantId,
  onHide,
  onEditAndResend,
}: {
  messageId: string | null;
  tenantId: string;
  onHide: () => void;
  onEditAndResend?: (rawMessage: string) => void;
}) {
  const detailQ = useQuery({
    queryKey: ["hl7-inbound-message", tenantId, messageId],
    enabled: !!messageId,
    queryFn: async (): Promise<Hl7InboundMessageDetailDto> => {
      const { data } = await Hl7InboundMessageAdminController.getMessage({
        path: { id: messageId! },
        headers: { "X-Tenant-Id": tenantId },
        throwOnError: true,
      });
      return data;
    },
  });

  const detail = detailQ.data;

  return (
    <Modal show={!!messageId} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>HL7 Inbound Message</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {detailQ.isPending ? (
          <div className="admin-empty">
            <Spinner size="sm" aria-hidden="true" />
            Loading message…
          </div>
        ) : detailQ.isError ? (
          <Alert variant="danger" className="mb-0">
            Failed to load message: {detailQ.error.message}
          </Alert>
        ) : (
          <>
            <FactList>
              <Fact label="Received">
                {detail?.createdDate
                  ? new Date(detail.createdDate).toLocaleString()
                  : "—"}
              </Fact>
              <Fact label="Message type">{detail?.messageType ?? "—"}</Fact>
              <Fact label="Message control ID">
                {detail?.messageControlId ?? "—"}
              </Fact>
              <Fact label="Patient ID">{detail?.patientId ?? "—"}</Fact>
              <Fact label="Sending app / facility">
                {[detail?.sendingApplication, detail?.sendingFacility]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </Fact>
              <Fact label="Message timestamp">
                {detail?.rawMessageTimestamp ?? "—"}
              </Fact>
              <Fact label="Status">
                {detail?.status ? (
                  <Badge bg={statusVariant(detail.status)}>
                    {detail.status}
                  </Badge>
                ) : (
                  "—"
                )}
              </Fact>
            </FactList>

            <section className="admin-section">
              <SectionHeader
                title="Raw message"
                actions={<CopyButton text={detail?.rawMessage} />}
              />
              <Hl7Payload raw={detail?.rawMessage} />
            </section>

            <section className="admin-section">
              <SectionHeader
                title="Acknowledgement"
                actions={<CopyButton text={detail?.acknowledgement} />}
              />
              <Hl7Payload raw={detail?.acknowledgement} />
            </section>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {onEditAndResend && detail?.rawMessage && (
          <Button
            variant="outline-primary"
            onClick={() => {
              onEditAndResend(detail.rawMessage!);
              onHide();
            }}
          >
            Edit &amp; Resend
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
