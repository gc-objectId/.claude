# Proposed tests for OR-3242

Write exactly these.

## OR-3242#0

- **file**: `qa-suite/smoke/patient-data.spec.ts`
- **assert**: Extend PAT-006: after the link assertions, open Add Operation on the Home-entered patient page, pick a procedure type and submit; assert the POST /api/admin/patients/{uuid}/operations/create request carried X-Tenant-Id={TENANT_CLIENT_ID} and that a second case row appears whose Launch href carries client_id={TENANT_CLIENT_ID}. Control: a positive-value assertion (a null tenant header is rejected by the server, so no row appears); observed red with the pre-fix bundle during validation. Must not disturb SMOKE_CASE_ID (it adds a second case, the smoke case stays).
- **id**: `PAT-005` (reserved for you — use this one, not the one in the line above)

