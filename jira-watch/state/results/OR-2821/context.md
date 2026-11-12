# OR-2821 — R1: add the acuity column and move the code onto it

Status: Testing   Assignee: Ryan Ducharme

## Description

Release 1 of the CaseClassification to CaseAcuity rename. Additive schema only, so pods on either mapping keep working through the rollout.

h3. Delivered

* Enum CaseClassification renamed to CaseAcuity across 26 files. Values are unchanged (ELECTIVE, NON_URGENT, URGENT, EMERGENT), so no data moves.
* New column operations.acuity, seeded from operations.classification by change-set 215-add-acuity-to-operations.
* Operation maps both columns. getAcuity() prefers acuity and falls back to classification, so a row last written by either pod generation reads correctly. setAcuity() writes acuity, and clears both columns when clearing, because otherwise a cleared acuity would read straight back through the fallback and the admin -- None -- action would silently do nothing.
* ProcedureAntibioticOptionDTO.caseClassification renamed to acuity, so the Valkey namespace ProcedureAntibioticCandidateService.SCOPE moves from antibiotic-resolution-v2 to v3, as that class documents.
* Admin endpoint PATCH /api/admin/patients/{patientId}/operations/{caseId}/classification becomes .../acuity, with UpdateOperationAcuityRequest. The frontend ships inside the same Spring Boot artifact, so there is no version-skew window.
* Generated TS client, the Operation.ts runtype, and the OperationTab.tsx label.
* Analytics base views select COALESCE(o.acuity, o.classification).
* ANTIBIOTIC_ACUITY_SCOPE.md, ANTIBIOTIC_PATHWAY_RESOLUTION.md, and data/org/CLAUDE.md.

h3. Deliberately unchanged

* Rule-firing details JSON keys keep the old word: USE_CLASSIFICATION_DISPLAY, ANTIBIOTIC_GROUP_CLASSIFICATIONS, and the record component Group.caseClassification. That column is a persisted audit record read back by four compliance evaluators and by TimelineEvent.
* Record::getClassification in MGBGetSurgicalRecordsSOAPCommand is a JAXB MGB wire type, not ours.
* Operation.acuity stays a String rather than the enum, because a shipped test stores the non-enum value Add-On.

h3. Landing, in this order

# Deploy the code and migration 215. The backfill is one UPDATE over at most ~100k rows per tenant across four tenant schemas: demo-demo, mgb-icsnh, mgb-mgh, mayo-mayo. No batching needed at that size. It takes ROW EXCLUSIVE, so reads and inserts are unaffected while concurrent updates to operations wait for the duration.
# Re-apply create_analytics_views.sql for mgb-mgh and mayo-mayo. Never before the migration: those scripts drop 25 objects, 12 for Mayo, before their first CREATE with no transaction wrapper, so a premature run leaves the analytics layer gone rather than stale.

h3. Considered and skipped: a post-rollout Valkey flush

This was raised and deliberately dropped, so it does not need rediscovering. SCOPE is a compile-time constant, so during the rollout two pod generations write two key namespaces while sharing the same case key (tenant:X/op:Y). Invalidation deletes only under the calling pod's own SCOPE, so an invalidation handled by an old pod removes the v2 entry and leaves a v3 entry that a v3 pod cached moments earlier. That entry is well-formed, so getResolutionFromCache returns it as a hit rather than recomputing; only an absent or unparseable entry triggers a repull.

Skipped because the interleaving is narrow and self-correcting: it needs a v3 cache write for a case, then a case-wide invalidation for that same case handled by an old pod, both inside the one-to-two minute mixed-fleet window and in that order. Any later invalidation reaching a v3 pod clears it, and the 24h TTL caps it regardless. Adding a previous-scope delete to the new code would not have helped, since the incomplete delete happens in already-deployed old code.

h3. Accepted residual

During the rollout, a pod on the old mapping that changes the acuity of an already-seeded row is invisible to pods on the new mapping, because the fallback only fires when acuity is NULL. Reconciled in R2 (OR-2822).

## Comments (0)

(none)
