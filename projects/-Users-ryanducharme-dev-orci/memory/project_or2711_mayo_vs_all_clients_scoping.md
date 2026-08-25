---
name: project_or2711_mayo_vs_all_clients_scoping
description: "OR-2711 deploy-scoping validated and closed 2026-08-24 — how each of the 8 items is gated, and that doxycycline being all-clients is intentional"
metadata:
  node_type: memory
  type: project
---

OR-2711 ("Deploy for Mayo vs all clients") was a deploy tracker with no code of its own; the deliverable was verifying that its Mayo-vs-all split is true. **Validated deploy-ready and moved to Done on 2026-08-24.** The branch never carried a commit — no PR.

How each item is actually gated:
- **Mayo-only:** OR-2526 ISC (`InsulinManagementService.selectStrategy`, `org == MAYO`); OR-2658 pediatric vancomycin (`AntibioticReminderConfigurationService.applyOverrides`, `org == MAYO`); OR-2612 `a-antibiotic-early-redose-no-crcl` (`PER_TENANT` flag, changesets 033/034).
- **All clients:** OR-2607 `a-known-procedure-antibiotic-not-recommended` — genuinely fires elsewhere, every tenant has NONE-configured procedures. OR-2321 / OR-2322 / OR-2623 / OR-2663 ship on for everyone but are inert off Mayo purely because the data is absent (Acuity and Risk are populated on Mayo rows only; `p-pancreatectomy` and the five D&E/D&C identifiers exist in Mayo's config and nowhere else).

**The one real finding:** `a-preop-doxycycline-check` (OR-2663) shipped enabled for every tenant while its own AC said "Tenant is Mayo" — see [[rule-feature-flag-defaults-to-all-tenants]]. Alexandra ruled **all clients is final** and OR-2711 is the authoritative take; OR-2663's description was corrected and its `mayo-only` label removed. No flag changeset was added — do not "fix" this later thinking it's an oversight.

**How to apply:** useful observables if this needs revisiting — ISC initialises to 0.03 on Mayo vs 0.01 on default (`POST .../isc/initialize` then `GET .../isc/current`); the no-CrCl variant's absence is isolated by checking its base rule evaluated on the *same* selection (a bare zero proves nothing on a selection-trigger rule); pediatric vancomycin shows as a 5h57m vs 7h57m scheduled trigger. Live evidence was gathered pre-pathways-rework — the mechanism under OR-2321/2322/2607/2623 has since been rewritten (see [[antibiotic-candidate-sources]]), though the scoping conclusion still holds on current main.
