---
name: project-or2640-infusion-netting
description: OR-2640 Mayo infusion netting validated deploy-ready; RXA-2 sub-id semantics and where the real RAS stream lives
metadata: 
  node_type: memory
  type: project
  originSessionId: 9c53c91d-1fdf-491f-b57f-ea4f0f88a76c
  modified: 2026-07-31T19:02:20.331Z
---

OR-2640 (Mayo infusion support) validated deploy-ready and moved to Done on 2026-07-31. Tests in PR #4255; implementation was PR #4109 with follow-ups #4146 and #4147.

**The mechanism worth remembering:** Mayo infusion events are upserted by **RXA-2 administration sub-id** on one `InfusionMedicationAdministration` per (order, medication). Same sub-id = an *edit* → replaced in place. New sub-id = a genuinely distinct transition → appended. Epic's rate-change recalculation **restates earlier administrations** rather than appending corrections, so a change to 75 re-sends sub-ids 1 and 2 at 75 and adds sub-id 3 — netting to 75/75/75. This is why the tracker's "phantom intermediates" complaint resolved without a netting algorithm: the sub-id upsert *is* the netting.

RXA-20 vocabulary handled: `Given`/`NewBag`/`Restarted` → START, `RateChange` → RATE_CHANGE, `Stopped` → STOP, `Canceled` → cancel path, anything else → IGNORED. **A resume arrives as a `NewBag` on the same sub-id**, not `Restarted` (confirmed against the real stream).

Cancels are per-event: each removes only its own sub-id; the record soft-deletes when the last event goes. The **order row survives** — matches Epic, where deleting the first event re-bases the next as a new bag. `@SQLRestriction` on `InfusionMedicationAdministration` hides soft-deleted rows from every Hibernate query, so there's no resurrection risk.

**Ground truth for future Mayo infusion work:** the real 7/10 propofol stream is in stage `mayo-rormc.hl7_inbound_messages`, patient PMRN 11292543, MCID 24000–24015, order `2222006643472`. `mayo-rormc` stopped receiving after 7/10; current Mayo tenant is `mayo-mayo`. Pull raw RAS with a `substring(raw_message from 'RXA\|[^\r\n]*')` projection rather than dumping whole messages.

Spun out: OR-2704 (debugger's infusion Completion Status list omits `Restarted`).

Related: [[project-mayo-integration-testing]], [[reference-local-hl7-inject-auth]], [[project-mayo-fhir-ticket-validation]].
