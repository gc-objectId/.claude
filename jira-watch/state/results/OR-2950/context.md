# OR-2950 — HL7 tenant token can write into another tenant via client_id or X-Tenant-Id

Status: Testing   Assignee: Ryan Ducharme

## Description

HL7TenantAuthFilter binds the tenant from a tenant-scoped API token. TenantFilter (@Order(25)) runs after the security chain and re-resolves the tenant from the client_id parameter, the X-Tenant-Id header, or the hostname. Its access check only runs when a User principal exists. A tenant token carries a Tenant principal, so the check is skipped and the request's tenant replaces the token's tenant. HL7InboundService.processTenantMessage then persists to TenantContextHolder.getTenant().

Result: a token issued for tenant A sent with X-Tenant-Id: B stores HL7 messages and downstream patient data in tenant B. B can be any enabled tenant in any org.

The org-token path is not affected. It routes by sending facility and wraps writes in an explicit withTenant.

Fix: in TenantFilter, a tenant already bound by a credential outranks the request. A differing request tenant returns 403. A matching or absent request tenant passes through unchanged.

Files: orci/src/main/java/com/guided/orci/web/filter/TenantFilter.java, orci/src/main/java/com/guided/orci/web/filter/HL7TenantAuthFilter.java, orci/src/main/java/com/guided/orci/service/HL7InboundService.java

## Comments (0)

(none)
