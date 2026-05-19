---
name: project-mayo-integration
description: "Mayo Clinic new client integration — Jira epic, tenant config, integration architecture, and current work status"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7f99c06d-ad6c-4dcb-b3a9-6d65d688a958
---

Mayo Clinic is onboarding as a new GuidedOR client under Jira epic OR-2434. Two tenants provisioned under a `mayo` org:
- `mayo-rosmc` — Rochester, Saint Mary's Campus (HL7 facility: ROMBMAINOR)
- `mayo-rormc` — Rochester, Eisenberg/Methodist Campus (HL7 facility: ROEIMAINOR)

**Key technical differentiator:** Mayo uses OAuth + R4 FHIR only — no service account, no SOAP, no DSTU2/DSTU3. First client with this profile.

FHIR base: `https://[test-]tls.mcc.apix.mayo.edu/epic-api/api/FHIR/R4`
OAuth token: `https://[test-]tls.mcc.apix.mayo.edu/epic-api/oauth2/token`

**Integration domains and key tickets:**
- FHIR: Auth (Done - OR-2443), Patient/Observations/Allergy/Conditions/Weight (Done/Ready for Testing), Height (In Progress - OR-2521), Medication Statement (To Do - OR-2438)
- HL7v2: Med Admins (In Progress - OR-2439, Theo), Lab Results (In Progress - OR-2440), Flowsheet (To Do - OR-2442, critical location filter needed), SIU scheduling (To Do - OR-2486)
- Tenant provisioning: Ready for Testing — OR-2448
- Clinical rules (Alexandra Wolfe): Antibiotic prophylaxis, procedure mapping, diabetes management (all In Progress/To Do)
- NDC mapping: In Progress — OR-2463
- Touchscreen UX: Gap analysis done (OR-2421), v2 implementation To Do (OR-2484)
- Open bug: UnknownTenantException for mayo-rosmc in TriggerListener — OR-2464

**Confluence tracking page:** https://guidedclinical.atlassian.net/wiki/spaces/EN/pages/edit-v2/439975937 (draft — "New Client Integration — Mayo Clinic", page ID 439975937)

**Why:** First live Mayo integration documentation effort; useful context for QA test planning around these tenants.
**How to apply:** Reference when working on Mayo-related tickets, designing test coverage for tenant provisioning, FHIR/HL7 integration testing, or clinical rules for the mayo-rosmc/mayo-rormc tenants.
