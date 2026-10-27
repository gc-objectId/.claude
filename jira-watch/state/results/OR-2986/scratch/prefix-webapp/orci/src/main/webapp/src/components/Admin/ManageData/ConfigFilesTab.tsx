import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Button, Form, Spinner, Table } from "react-bootstrap";
import {
  ConfigFileDto,
  ConfigImportResultDto,
  ConfigImportController,
} from "@api";
import { useTenantId } from "../../../context/TenantContext";
import { ConfigFileUploadModal } from "./ConfigFileUploadModal";
import { replacesAll } from "./configFileSemantics";

/**
 * Every clinical configuration file the application imports, with an on-demand upload for each.
 *
 * The list comes from the backend's ConfigFile catalog, so a config file added there shows up here
 * with no change to this component.
 */
export function ConfigFilesTab({ isActive }: { isActive: boolean }) {
  const tenantId = useTenantId();
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState<ConfigFileDto | null>(null);
  const [lastImport, setLastImport] = useState<ConfigImportResultDto | null>(
    null,
  );

  const configFilesQ = useQuery({
    queryKey: ["config-files", tenantId],
    queryFn: async () => {
      const response = await ConfigImportController.listConfigFiles({
        headers: { "X-Tenant-Id": tenantId },
        throwOnError: true,
      });
      return response.data;
    },
    enabled: isActive,
  });

  const groups = useMemo(
    () => groupByCategory(configFilesQ.data ?? [], search),
    [configFilesQ.data, search],
  );

  if (configFilesQ.status === "pending") {
    return <Spinner />;
  }
  if (configFilesQ.status === "error") {
    return (
      <Alert variant="danger">
        Unable to load the configuration file list.
        <pre className="mb-0 mt-2">{String(configFilesQ.error)}</pre>
      </Alert>
    );
  }

  const matchCount = groups.reduce(
    (total, group) => total + group.files.length,
    0,
  );

  return (
    <div>
      {lastImport && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setLastImport(null)}
        >
          Imported <strong>{lastImport.displayName}</strong> from{" "}
          <code>{lastImport.fileName}</code> in{" "}
          {(lastImport.durationMs / 1000).toFixed(1)}s.{" "}
          <RecordCountChange result={lastImport} />
        </Alert>
      )}

      <Form.Control
        type="search"
        className="mb-3"
        placeholder="Search configuration files"
        aria-label="Search configuration files"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {matchCount === 0 && (
        <p className="text-muted">No configuration files match “{search}”.</p>
      )}

      {groups.map((group) => (
        <div key={group.category} className="mb-4">
          <h5 className="text-uppercase text-muted fs-6">{group.category}</h5>
          <Table striped bordered hover size="sm" className="align-middle">
            <thead>
              <tr>
                <th>File</th>
                <th>On import</th>
                <th className="text-end">Records</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {group.files.map((configFile) => (
                <tr key={configFile.key}>
                  <td>
                    <div>{configFile.displayName}</div>
                    <code className="text-muted small">
                      {configFile.fileName}
                    </code>
                  </td>
                  <td>
                    <Badge
                      bg={replacesAll(configFile) ? "warning" : "secondary"}
                      text={replacesAll(configFile) ? "dark" : undefined}
                      title={configFile.semanticsDescription}
                    >
                      {configFile.semantics}
                    </Badge>
                  </td>
                  <td className="text-end">
                    {configFile.recordCount?.toLocaleString() ?? "—"}
                  </td>
                  <td className="text-end">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => setUploading(configFile)}
                    >
                      Upload
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ))}

      {uploading && (
        <ConfigFileUploadModal
          configFile={uploading}
          onHide={() => setUploading(null)}
          onImported={(result) => {
            setUploading(null);
            setLastImport(result);
            configFilesQ.refetch();
          }}
        />
      )}
    </div>
  );
}

function RecordCountChange({ result }: { result: ConfigImportResultDto }) {
  if (result.recordCountAfter == null) {
    return <>No record count is tracked for this file.</>;
  }
  if (result.recordCountBefore == null) {
    return (
      <>{result.recordCountAfter.toLocaleString()} records in the system.</>
    );
  }
  return (
    <>
      {result.recordCountBefore.toLocaleString()} →{" "}
      {result.recordCountAfter.toLocaleString()} records.
    </>
  );
}

type ConfigFileGroup = { category: string; files: ConfigFileDto[] };

/**
 * Groups in the order the backend catalog returns them, so related files stay adjacent rather than
 * being alphabetised apart.
 */
function groupByCategory(
  configFiles: ConfigFileDto[],
  search: string,
): ConfigFileGroup[] {
  const needle = search.trim().toLowerCase();
  const groups: ConfigFileGroup[] = [];

  for (const configFile of configFiles) {
    if (needle && !matches(configFile, needle)) {
      continue;
    }
    const group = groups.find(
      (candidate) => candidate.category === configFile.categoryDisplayName,
    );
    if (group) {
      group.files.push(configFile);
    } else {
      groups.push({
        category: configFile.categoryDisplayName,
        files: [configFile],
      });
    }
  }
  return groups;
}

function matches(configFile: ConfigFileDto, needle: string): boolean {
  return [
    configFile.displayName,
    configFile.fileName,
    configFile.categoryDisplayName,
    configFile.key,
  ].some((field) => field.toLowerCase().includes(needle));
}
