import React, { ChangeEvent, useCallback, useState } from "react";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import { isAxiosError } from "axios";
import {
  ConfigFileDto,
  ConfigImportResultDto,
  ConfigImportController,
} from "@api";
import { useTenantId } from "../../../context/TenantContext";
import { getCookie } from "../../../utils/cookie";
import { replacesAll } from "./configFileSemantics";

type ConfigFileUploadModalProps = {
  configFile: ConfigFileDto;
  onHide: () => void;
  onImported: (result: ConfigImportResultDto) => void;
};

export function ConfigFileUploadModal({
  configFile,
  onHide,
  onImported,
}: ConfigFileUploadModalProps) {
  const tenantId = useTenantId();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
  };

  const uploadFile = useCallback(async () => {
    if (!file) {
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const response = await ConfigImportController.importConfigFile({
        path: { key: configFile.key },
        body: { file },
        headers: {
          "Content-Type": "multipart/form-data",
          "X-Tenant-Id": tenantId,
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") || "",
        },
        throwOnError: true,
      });
      onImported(response.data);
    } catch (e) {
      console.error(`Failed to import ${configFile.key}`, e);
      setError(importErrorMessage(e));
    } finally {
      setImporting(false);
    }
  }, [configFile.key, file, onImported, tenantId]);

  const renamedOnUpload = file !== null && file.name !== configFile.fileName;

  return (
    <Modal
      show
      onHide={importing ? () => undefined : onHide}
      size="lg"
      keyboard={!importing}
      backdrop={importing ? "static" : true}
    >
      <Modal.Header closeButton={!importing}>
        <Modal.Title>Import {configFile.displayName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Importing into <code>{tenantId}</code> from{" "}
          <code>{configFile.fileName}</code>.
        </p>
        <Alert variant={replacesAll(configFile) ? "warning" : "info"}>
          <strong>{configFile.semantics}.</strong>{" "}
          {configFile.semanticsDescription}
          {configFile.recordCount != null && (
            <>
              {" "}
              There {configFile.recordCount === 1 ? "is" : "are"} currently{" "}
              <strong>{configFile.recordCount.toLocaleString()}</strong>{" "}
              {configFile.recordCount === 1 ? "record" : "records"} in the
              system.
            </>
          )}
        </Alert>
        <Form>
          <Form.Group className="mb-3" controlId="config-file-upload-input">
            <Form.Label className="fw-bold">
              {configFile.fileExtension.replace(".", "").toUpperCase()} file
            </Form.Label>
            <Form.Control
              type="file"
              accept={configFile.fileExtension}
              onChange={handleFileChange}
              disabled={importing}
            />
          </Form.Group>
        </Form>
        {renamedOnUpload && (
          <Alert variant="secondary" className="py-2">
            <code>{file.name}</code> will be imported as{" "}
            <code>{configFile.fileName}</code>. Only the contents matter.
          </Alert>
        )}
        {error && <Alert variant="danger">{error}</Alert>}
        {importing && (
          <div className="d-flex align-items-center">
            <Spinner animation="border" size="sm" className="me-2" />
            <span>Importing. Large files can take a minute.</span>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          onClick={() => uploadFile()}
          disabled={!file || importing}
        >
          Import
        </Button>
        <Button variant="secondary" onClick={onHide} disabled={importing}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/**
 * The backend reports failures as a Spring error body, whose `message` carries the reason the
 * importer gave. That reason is the only part worth showing: "Unknown medication identifier
 * XYZ on row 12" tells an administrator what to fix, "Request failed with status 500" does not.
 */
function importErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 413) {
      return "That file is too large to upload.";
    }
    const data: unknown = error.response?.data;
    if (
      data !== null &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string" &&
      data.message.length > 0
    ) {
      return data.message;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Import failed unexpectedly.";
}
