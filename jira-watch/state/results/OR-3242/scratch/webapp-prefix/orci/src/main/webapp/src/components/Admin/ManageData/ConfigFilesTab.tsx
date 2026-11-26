import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import { AdminTable } from "../AdminTable";
import { SectionHeader } from "../../SectionHeader";
import {
  ConfigFileDto,
  ConfigImportResultDto,
  ConfigImportController,
} from "@api";
import { useTenantId } from "../../../context/TenantContext";
import { ConfigFileUploadModal } from "./ConfigFileUploadModal";
import { replacesAll } from "./configFileSemantics";
import "./ConfigFilesTab.scss";

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
    return (
      <div className="admin-empty">
        <Spinner size="sm" aria-hidden="true" />
        Loading configuration files…
      </div>
    );
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
          <strong>{lastImport.fileName}</strong> in{" "}
          {(lastImport.durationMs / 1000).toFixed(1)}s.{" "}
          <RecordCountChange result={lastImport} />
        </Alert>
      )}

      <div className="admin-toolbar">
        <Form.Control
          type="search"
          className="admin-toolbar__search"
          placeholder="Search configuration files"
          aria-label="Search configuration files"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {matchCount === 0 && (
        <div className="admin-empty">
          No configuration files match “{search}”.
        </div>
      )}

      {groups.map((group) => (
        <section key={group.category} className="admin-section">
          <SectionHeader title={group.category} />
          <AdminTable className="config-files__table">
            <colgroup>
              <col />
              <col className="config-files__col-import" />
              <col className="config-files__col-records" />
              <col className="config-files__col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>File</th>
                <th>On import</th>
                <th className="text-end">Records</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {group.files.map((configFile) => (
                <tr key={configFile.key}>
                  <td>
                    {configFile.displayName}
                    <span className="admin-table__secondary">
                      {configFile.fileName}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        replacesAll(configFile)
                          ? "guided-tag guided-tag--warning"
                          : "guided-tag"
                      }
                      title={configFile.semanticsDescription}
                    >
                      {configFile.semantics}
                    </span>
                  </td>
                  <td className="text-end">
                    {configFile.recordCount?.toLocaleString() ?? "—"}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => setUploading(configFile)}
                      >
                        Upload
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </section>
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
