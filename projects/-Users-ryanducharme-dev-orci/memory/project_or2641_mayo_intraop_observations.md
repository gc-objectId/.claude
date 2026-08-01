---
name: or2641-mayo-intraop-observations
description: OR-2641 validated Done — Mayo intraop flowsheet observations (glucose/TOF/TOF-ratio); established the FLOW qa-suite family
metadata: 
  node_type: memory
  type: project
  originSessionId: 9927eda7-e654-4b05-b7fd-acdfab185889
  modified: 2026-07-31T19:40:47.152Z
---

**OR-2641 (Mayo intraop observation values): validated deploy-ready, Done 2026-07-31.** Tests in [PR #4258](https://github.com/guidedclinical/orci/pull/4258) (draft at close-out). Implementation under test was Theo's PR #4151 (merged 2026-07-21).

**Mechanism.** Mayo ORU^R01 splits on `MSH-3-2` in `MayoHL7OruProcessor`: `ORU_FLOWSHEET` → `MayoHL7OruFlowsheetProcessor` (intraop; Epic local MA451 numeric codes, hardcoded `MA451_TYPE_MAP`), `ORU_LAB_RESULTS` → `MayoHL7OruLabResultProcessor` (LOINC, typed via `observation_set` DB seed data). Flowsheet typing is therefore deterministic across environments; lab typing is not.

**Confirmed live** (admin `POST /api/admin/hl7-inbound-messages/send`, tenant `mayo-mayo`): glucose flowsheet MA451 `14032053` → `GLUCOSE`; glucose lab LOINC `2345-7` → `GLUCOSE`; TOF flowsheet MA451 `14032776` → `TOF` (twitch count). Matches Theo's "glucose (flow and lab) and TOF (flow)".

**Root cause of "recent attempts have not come across":** TOF had no MA451 mapping, so rows arrived but stayed untyped — and every consumer reaches an observation through its `ObservationType`, so they were invisible to the rules. #4151 added the mapping.

**TOF Ratio is absent by design, not a gap.** Nothing maps to `TOF_RATIO` on either Mayo route (`MGHFlowsheetService` does, but that's MGB). `TOFSugammadexAdjustmentWarningRule` gates ratio dosing behind `TOF_4_RATIO_DOSING_ENABLED`, seeded `false` for `mayo-mayo` in liquibase changeset 201 → TOF 4 resolves to 2 mg/kg with no ratio lookup. Sign-off doc already lists `a-nmb-reversal-scan` as N/A for Mayo. Separately, TOF *delivery* from Mayo is intermittent (stalled in their interface engine) — upstream, not ours.

**New qa-suite family `FLOW`** — `qa-suite/integrations/mayo/hl7-flowsheet-observations.{spec.ts,md}`, `FLOW-001..003`, all `@supplemental`. Covers the flowsheet route, which `ORU-001..004` (lab route only) never touched. Also extracted the four admin-HL7 helpers to `qa-suite/fixtures/hl7-api.ts` (they take a tenant key, not a hardcoded one); `hl7-lab-results.spec.ts` now shares them.

**Design choice worth reusing:** these assert the resolved `ObservationType`, not the stored row count. Whether an unmapped code is dropped or stored untyped is a storage policy that *changed on 2026-07-30* (commit `adcbceee0`, drop-untyped) — asserting on type keeps the e2e stable across it and matches what consumers actually read. Row-count/drop behavior is asserted at the unit level in `MayoHL7OruFlowsheetProcessorTest` (23 tests).

Related: [[mayo-integration-testing]], [[mayo-fhir-ticket-validation]], [[stale-local-app-build]], [[prettier-hook-version-conflict]]
