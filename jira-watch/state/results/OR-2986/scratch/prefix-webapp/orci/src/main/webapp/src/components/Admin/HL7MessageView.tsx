import React, { useState } from "react";
import { Badge, Button, Modal, Spinner } from "react-bootstrap";
import { useQuery } from "@tanstack/react-query";
import { Clipboard, ClipboardCheck } from "react-bootstrap-icons";
import { Hl7InboundMessageAdminController } from "@api";
import type { Hl7InboundMessageDetailDto } from "@api";
import { formatHl7Segments, splitSegmentId } from "../../utils/hl7";

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
function Hl7Payload({ raw }: { raw: string | undefined }) {
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

function CopyButton({ text }: { text: string | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <Button
      variant="outline-secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <ClipboardCheck /> : <Clipboard />} {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="d-flex mb-1">
      <div className="text-muted" style={{ minWidth: "160px" }}>
        {label}
      </div>
      <div className="flex-grow-1">
        {value ?? <span className="text-muted">—</span>}
      </div>
    </div>
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
        <Modal.Title className="fs-5">HL7 Inbound Message</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {detailQ.isPending ? (
          <div className="d-flex align-items-center gap-2">
            <Spinner animation="border" size="sm" /> Loading…
          </div>
        ) : detailQ.isError ? (
          <div className="alert alert-danger mb-0">
            Failed to load message: {detailQ.error.message}
          </div>
        ) : (
          <>
            <DetailRow
              label="Received"
              value={
                detail?.createdDate
                  ? new Date(detail.createdDate).toLocaleString()
                  : undefined
              }
            />
            <DetailRow label="Message type" value={detail?.messageType} />
            <DetailRow
              label="Message control ID"
              value={detail?.messageControlId}
            />
            <DetailRow label="Patient ID" value={detail?.patientId} />
            <DetailRow
              label="Sending app / facility"
              value={[detail?.sendingApplication, detail?.sendingFacility]
                .filter(Boolean)
                .join(" / ")}
            />
            <DetailRow
              label="Message timestamp"
              value={detail?.rawMessageTimestamp}
            />
            <DetailRow
              label="Status"
              value={
                detail?.status ? (
                  <Badge bg={statusVariant(detail.status)}>
                    {detail.status}
                  </Badge>
                ) : undefined
              }
            />

            <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
              <strong>Raw message</strong>
              <CopyButton text={detail?.rawMessage} />
            </div>
            <Hl7Payload raw={detail?.rawMessage} />

            <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
              <strong>Acknowledgement</strong>
              <CopyButton text={detail?.acknowledgement} />
            </div>
            <Hl7Payload raw={detail?.acknowledgement} />
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
