import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { ArrowsFullscreen, Check, Clipboard } from "react-bootstrap-icons";
import { useCopyToClipboard } from "@uidotdev/usehooks";

type JSONViewProps = {
  data: Record<string, unknown> | null | undefined;
  maxHeight?: number;
  maxWidth?: number;
};

export function JSONView({
  data,
  maxHeight = 160,
  maxWidth = 640,
}: JSONViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const pretty = data ? JSON.stringify(data, null, 2) : null;

  const handleCopy = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!pretty) return;
      copyToClipboard(pretty);
      setCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    },
    [copyToClipboard, pretty],
  );

  if (!data) {
    return <>No Data</>;
  }

  return (
    <>
      <div className="position-relative">
        <div className="position-absolute top-0 end-0 d-flex gap-1 m-1">
          <Button
            variant="outline-secondary"
            size="sm"
            className="admin-icon-button"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} /> : <Clipboard size={14} />}
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            className="admin-icon-button"
            onClick={() => setShowModal(true)}
            title="Expand"
          >
            <ArrowsFullscreen size={14} />
          </Button>
        </div>
        <pre
          className="admin-pre admin-pre--scrolling pe-5"
          style={{ maxHeight, maxWidth }}
        >
          {pretty}
        </pre>
      </div>
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <pre
            className="admin-pre admin-pre--scrolling"
            style={{ maxHeight: "70vh" }}
          >
            {pretty}
          </pre>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => handleCopy()}>
            {copied ? "Copied!" : "Copy to Clipboard"}
          </Button>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
