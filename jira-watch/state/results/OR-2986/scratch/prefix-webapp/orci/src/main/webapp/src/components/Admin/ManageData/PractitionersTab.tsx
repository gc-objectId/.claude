import { useTenantId } from "../../../context/TenantContext";
import React, { useCallback, useEffect, useState } from "react";
import { Button, Form, Table } from "react-bootstrap";
import { PaginatedView } from "../PaginatedView";
import { Paginated } from "../../../types/Paginated";
import { PractitionerAdminController } from "@api";
import type {
  BulkRefreshResultDto,
  PagedModelPractitionerListDto,
  PractitionerListDto,
  PractitionerRefreshResultDto,
} from "@api";
import { getCapabilitiesOptions } from "@api/@tanstack/react-query.gen";
import { ArrowClockwise } from "react-bootstrap-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type RefreshOutcome = NonNullable<PractitionerRefreshResultDto["outcome"]>;

/** How each outcome reads on the row: what happened, and whether it needs attention. */
const OUTCOME_MARKERS: Record<
  RefreshOutcome,
  { symbol: string; variant: string; label: string }
> = {
  REFRESHED: {
    symbol: "✓",
    variant: "success",
    label: "Refreshed from FHIR",
  },
  NO_MATCH: {
    symbol: "–",
    variant: "secondary",
    label: "FHIR has no practitioner for this id (e.g. a service account)",
  },
  INSUFFICIENT_DATA: {
    symbol: "?",
    variant: "warning",
    label: "Nothing to look up: no linked user and no epic user id",
  },
  UNSUPPORTED_TENANT: {
    symbol: "?",
    variant: "warning",
    label: "This tenant has no FHIR integration",
  },
  FAILED: {
    symbol: "✗",
    variant: "danger",
    label: "Refresh failed: the FHIR lookup or the save errored",
  },
};

function describeBulkResult(result: BulkRefreshResultDto): string {
  return [
    `${result.refreshed ?? 0} refreshed`,
    `${result.noMatch ?? 0} no match`,
    `${result.skipped ?? 0} skipped`,
    `${result.failed ?? 0} failed`,
  ].join(", ");
}

function toPagedResult(
  response: PagedModelPractitionerListDto,
): Paginated<PractitionerListDto> {
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

async function fetchPractitioners(
  page: number,
  size: number,
  search: string,
  tenantId: string,
): Promise<Paginated<PractitionerListDto>> {
  const { data } = await PractitionerAdminController.getPractitioners({
    query: {
      page,
      size,
      ...(search ? { search } : {}),
    } as { page: number; size: number; search?: string },
    headers: {
      "X-Tenant-Id": tenantId,
    },
  });
  return toPagedResult(data!);
}

function RefreshButton({
  practitionerId,
  tenantId,
}: {
  practitionerId: string;
  tenantId: string;
}) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [outcome, setOutcome] = useState<RefreshOutcome | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setOutcome(null);
    try {
      // The generated client resolves rather than throws on a non-2xx, so read the outcome off the
      // body and only fall back to FAILED when there is no body to read.
      const { data } = await PractitionerAdminController.refreshPractitioner({
        path: { id: practitionerId },
        headers: { "X-Tenant-Id": tenantId },
      });
      await queryClient.invalidateQueries({
        queryKey: ["practitioners", tenantId],
      });
      setOutcome(data?.outcome ?? "FAILED");
    } catch {
      setOutcome("FAILED");
    } finally {
      setRefreshing(false);
      setTimeout(() => setOutcome(null), 5000);
    }
  }, [practitionerId, tenantId, queryClient]);

  const marker = outcome ? OUTCOME_MARKERS[outcome] : undefined;

  return (
    <Button
      variant={marker ? `outline-${marker.variant}` : "outline-secondary"}
      size="sm"
      onClick={handleRefresh}
      disabled={refreshing}
      title={marker?.label ?? "Refresh practitioner metadata from FHIR"}
    >
      <ArrowClockwise className={refreshing ? "spin" : ""} />
      {marker && ` ${marker.symbol}`}
    </Button>
  );
}

export function PractitionersTab({ isActive }: { isActive: boolean }) {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  // Refresh reads from the tenant's Epic FHIR API, so the server decides which tenants have one
  // rather than the UI keeping its own list of orgs.
  const capabilitiesQ = useQuery({
    ...getCapabilitiesOptions({ headers: { "X-Tenant-Id": tenantId } }),
    enabled: isActive,
  });
  const showRefresh = capabilitiesQ.data?.refreshSupported === true;

  // Counts belong to the tenant they were gathered for; showing mgh's totals under mayo is a lie.
  useEffect(() => {
    setBulkResult(null);
    setSelectedIds(new Set());
  }, [tenantId]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((items: PractitionerListDto[]) => {
    setSelectedIds((prev) => {
      const allIds = items.map((p) => p.id!);
      const allSelected = allIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(allIds);
    });
  }, []);

  const handleBulkRefresh = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkRefreshing(true);
    setBulkResult(null);
    try {
      const { data } =
        await PractitionerAdminController.bulkRefreshPractitioners({
          body: [...selectedIds],
          headers: { "X-Tenant-Id": tenantId },
        });
      await queryClient.invalidateQueries({
        queryKey: ["practitioners", tenantId],
      });
      setSelectedIds(new Set());
      setBulkResult(data ? describeBulkResult(data) : "Bulk refresh failed");
    } finally {
      setBulkRefreshing(false);
    }
  }, [selectedIds, tenantId, queryClient]);

  if (!isActive) return null;

  return (
    <PaginatedView<PractitionerListDto, string>
      searchable={true}
      initialSearchParams=""
      queryKey={["practitioners", tenantId]}
      queryFn={(page, size, search) =>
        fetchPractitioners(page, size, search, tenantId)
      }
    >
      {({ items, setSearchParams, searchParams }) => (
        <div>
          <div className="d-flex align-items-center mb-3 gap-3">
            <Form.Group
              controlId="practitioner-search"
              className="d-flex align-items-center"
            >
              <Form.Label className="me-2 mb-0">Search:</Form.Label>
              <Form.Control
                type="text"
                value={searchParams}
                onChange={(e) => setSearchParams(e.target.value)}
                placeholder="Search term"
                style={{ width: "400px" }}
              />
            </Form.Group>
            {showRefresh && (
              <>
                <Button
                  variant="outline-primary"
                  size="sm"
                  disabled={selectedIds.size === 0 || bulkRefreshing}
                  onClick={handleBulkRefresh}
                >
                  <ArrowClockwise
                    className={bulkRefreshing ? "spin me-1" : "me-1"}
                  />
                  Refresh Selected ({selectedIds.size})
                </Button>
                {bulkResult && (
                  <span className="text-muted small">{bulkResult}</span>
                )}
              </>
            )}
          </div>
          {items.length === 0 ? (
            <div>No practitioners found.</div>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  {showRefresh && (
                    <th style={{ width: "40px" }}>
                      <Form.Check
                        type="checkbox"
                        checked={
                          items.length > 0 &&
                          items.every((p) => selectedIds.has(p.id!))
                        }
                        onChange={() => toggleAll(items)}
                      />
                    </th>
                  )}
                  <th>Name</th>
                  <th>Client User ID</th>
                  <th>Epic User ID</th>
                  <th>Epic Provider ID</th>
                  <th>Role</th>
                  <th>Email</th>
                  {showRefresh && <th></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    {showRefresh && (
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={selectedIds.has(p.id!)}
                          onChange={() => toggleSelection(p.id!)}
                        />
                      </td>
                    )}
                    <td>{p.name}</td>
                    <td>{p.clientUserId}</td>
                    <td>{p.epicUserId}</td>
                    <td>{p.epicProviderId}</td>
                    <td>{p.role}</td>
                    <td>{p.email}</td>
                    {showRefresh && (
                      <td>
                        <RefreshButton
                          practitionerId={p.id!}
                          tenantId={tenantId}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </PaginatedView>
  );
}
