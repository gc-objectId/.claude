import { TenantID } from "../types/identifiers";

const GUIDEDCLINICAL_HOST_REGEX =
  /^(?:([a-z0-9-]+))\.guidedor(?:-dev|-stage)?\.guidedclinical\.com$/;

export function deriveTenantId(): TenantID | null {
  const params = new URLSearchParams(window.location.search);
  const tenantFromQuery = params.get("client_id");
  if (tenantFromQuery) {
    return tenantFromQuery as TenantID;
  }

  const match = window.location.hostname
    .toLowerCase()
    .match(GUIDEDCLINICAL_HOST_REGEX);
  if (match?.[1]) {
    return match[1] as TenantID;
  }

  return null;
}
