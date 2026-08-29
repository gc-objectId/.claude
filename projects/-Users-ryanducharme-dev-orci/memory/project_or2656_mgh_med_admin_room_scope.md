---
name: project_or2656_mgh_med_admin_room_scope
description: "OR-2656 closed no-code — MGH med admins arrive only in MGH OR NN study rooms (99.7%) vs everything else (0.1%); scope, not a defect"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3e86876b-5537-4385-bdf1-2543901bc756
  modified: 2026-08-28T19:58:39.196Z
---

OR-2656 ("Missing med admins for L&D and Blake rooms at MGH") closed Done 2026-08-28, no code change. Alex's real question was whether it signalled a wider problem; it does not.

**Mechanism.** MGH med admins arrive through exactly two channels, with no polling between them:
- One-shot SOAP snapshot at app launch, window `now-8d → now+1d` (`AppLaunchController:128` → `MGBGetPatientInfoStrategy:324` → `MGBCommandFactory.getMedicationAdministrations`). Stored as `source_type = OTHER`.
- Epic push notifications `MED ADMIN NOTIFICATION - *` → `MGBNotificationController` → `MGBNotificationService.handleMedicationAdministrationEvent`. Stored as `source_type = EMR`.

That source_type split is the useful lever: **filtering on `EMR` measures the notification channel alone.**

**Evidence** (6 months of adult MGH operations, run in MGB's Metabase):
- Study rooms (`MGH OR NN`): 19,134 ops, 19,071 with EMR med admins — 99.7%
- Everything else: 13,628 ops, 13 — 0.1%

Binary switch, not degradation. Affects *every* location outside `MGH OR NN` — all Blake 4 proc rooms, EP labs, cath labs, CRP proc rooms, Ellison 910, L&D OR 01/02 — not just the two the ticket named. Only exceptions: Cath Lab 1 and Cath Lab 6 (1 op each), OR Travel (11/20). Study cohorts are defined in `create_analytics_views.sql:137-153`.

**Two silent drop points in the notification handler** worth knowing: `MGBNotificationService.java:196` (patient unknown to us) and `:276` (medication has no client mapping, logs `"ERX: {} from Order: {} has no client medication mapping"`). The second is **not** room-scoped, so it was the candidate for a widespread cause — ruled out, since 99.7% study-room coverage leaves no room for material loss. Residual, never measured: coverage was counted per *operation* (any EMR admin counts), so one unmapped medication could still be dropped inside an otherwise-covered case.

**How to apply:** for "why are med admins missing at MGH" questions, check the room name against `^MGH OR (0[1-9]|[1-8][0-9]|9[01])$` first — outside that pattern the answer is scope, and no investigation is needed. Data must be run by someone with MGB Metabase access ([[reference_mgh_data_not_in_aws_rds]]); Metabase native questions execute one statement, so paste queries individually. Related: [[reference_antibiotic_candidate_sources]].
