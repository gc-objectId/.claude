---
name: project_or2875_all_procedures_gate
description: "OR-2875 antibiotic guidance withholds on any unmapped/unconfigured procedure — validated locally against Theo's unmerged PR #4521; tests written on the worktree branch; Done transition deferred to merge"
metadata: 
  node_type: memory
  type: project
  originSessionId: a4915909-91a5-45fe-b14b-1a5578f8fc98
  modified: 2026-09-04T16:34:23.903Z
---

OR-2875 (Task, Theo's): antibiotic guidance now withholds for the whole case when any source procedure
mapped to nothing (`SUPPRESSED_UNMAPPED_PROCEDURE`, read from new jsonb `operations.source_procedure_mappings`,
tenant changeset 224) or any mapped procedure has no applicable pathway (`SUPPRESSED_UNCONFIGURED_PROCEDURE`).
`None` counts as an answer; `NOT_CONFIGURED` was renamed `NO_PROCEDURE_PROVIDED` (no analytics/TS consumers).

State on 2026-09-04: implementation is PR #4521 (open, not draft, CI green, unreviewed). Validated locally
against a build of that branch on 8081 (Mayo SIU path + demo admin path, all scenarios per spec). Validation
comment posted on the ticket; **ticket left In Progress** — Done only after #4521 merges. Tests written on
`feature/OR-2875-antibiotics-recommendations-all-procedures` (worktree), which has `origin/OR-2875` merged in
so the diff includes Theo's commits until his PR lands; open the tests PR after his merge (or rebase onto main).

Coverage added (qa-suite, all @supplemental, API-only): PABX-019/020 (demo: no-antibiotic and
not-recommended rules abstain on None+unconfigured with firing controls), new PMAP family
`integrations/mayo/hl7-procedure-mapping.spec.ts` (SIU unmapped withholds, rescheduling frees, unmapped beside None).
New fixtures: `getNotFiredRuleEvaluations`, `getAntibioticGuidance`, `evaluateMedicationSelection`,
`mayoSiuMessage`; `createOperation` accepts `string[]`.

**Why:** Ryan chose "validate PR locally" over review/implement; the SDLC assumption (merged before validate)
did not hold, so the deploy-ready Done signal would have misstated an unreviewed PR.
**How to apply:** at merge confirmation, post nothing new beyond the tests-PR link and move OR-2875 to Done.
Related: [[reference_antibiotic_guidance_debug_endpoint]], [[reference_non_pen_ceph_allergy_path]],
[[feedback_validate_against_main]].
