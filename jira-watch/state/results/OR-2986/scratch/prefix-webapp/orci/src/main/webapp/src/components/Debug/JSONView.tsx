import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { Clipboard, ArrowsFullscreen } from "react-bootstrap-icons";
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
        <div
          className="position-absolute d-flex gap-1"
          style={{ top: 4, right: 16 }}
        >
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleCopy}
            title="Copy to clipboard"
            style={{ padding: "2px 6px" }}
          >
            {copied ? "Copied!" : <Clipboard size={14} />}
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setShowModal(true)}
            title="Expand"
            style={{ padding: "2px 6px" }}
          >
            <ArrowsFullscreen size={14} />
          </Button>
        </div>
        <pre
          className="mb-0"
          style={{
            maxHeight,
            maxWidth,
            overflow: "auto",
            paddingRight: 90,
          }}
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
          <pre className="mb-0" style={{ maxHeight: "70vh", overflow: "auto" }}>
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
