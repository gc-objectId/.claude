---
name: project_or2630_mayo_null_operation_admins
description: OR-2630 Mayo null-operation med admins — not a live bug; how to size orphan bugs (bucket test) and verify the happy path
metadata: 
  node_type: memory
  type: project
  originSessionId: 7cfbf529-491b-4e2a-8eaa-1a588da54d06
  modified: 2026-07-28T15:24:58.796Z
---

OR-2630 ("med admins from Mayo rely on the operation to exist to show in debugger"). Validated 2026-07-28 → **not a live bug, closed**. Theo was right that a null `operation_id` is expected; the fix hypothesis (OR-2633 mono-Mayo) was orthogonal.

**Methodology lesson (this is the durable part):** raw orphan counts overstate the bug. Don't report "N med admins have null operation_id" as the defect. The real test is a per-orphan bucket against Theo's rule — *"a missing operation only matters if a real case for the patient failed to link"*:
1. patient has **no operation** → expected (meds outside any case)
2. admin falls **within a real case window** (coalesce start_time/reportable_start_time/scheduled_start_time ≤ adt ≤ coalesce end) → **the actual bug**
3. timed case exists, admin **outside** its window → expected (pre/post-op / PRN)
4. case exists but **no usable timing at all** → indeterminate; inspect the meds (bucket 4 here was scopolamine patches / SL nitro on untimed booked cases = pre-op, not intraop)

For OR-2630 on stage `mayo-mayo`: bucket 2 = **0** of 41 orphans. Then confirm the **happy path** positively (don't infer from orphans alone): linked intraop admins on timed cases must actually evaluate — join `medication_administrations.tracking_id` → `rule_execution_contexts.tracking_id`. Got 35/35 linked admins on timed cases with rule executions.

**Mechanism (for the latent follow-up):** Mayo med-admin attribution (`findOperationBasedOnStartTime`) keys on `Operation.startTime`. The Mayo HL7 pipeline never sets `startTime` — SIU sets `scheduledStartTime`, timing events set `reportableStartTime` (via `updateReportableStartTime`); `startTime` is only set by interactive app-launch (`startOperation`), and Mayo runs `EvaluationMode.SILENT`. `evaluateEmrAdministration` early-returns when operation is null, so an admin that orphans gets no CDS. Latent risk = intraop med arrives before its case gets timing + no backfill re-links. Not occurring in data → deferred as a small backfill follow-up if it ever bites. See [[project_mayo_integration_testing]].
