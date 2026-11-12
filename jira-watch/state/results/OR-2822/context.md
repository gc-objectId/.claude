# OR-2822 — R2: move reads onto acuity and retire the classification fallback

Status: Testing   Assignee: Ryan Ducharme

## Description

Release 2 of the rename. Depends on R1 being fully deployed. The four steps must ship in this order, and the column is NOT dropped here (see R3).

h3. Steps

# Re-backfill stragglers: UPDATE operations SET acuity = classification WHERE acuity IS NULL AND classification IS NOT NULL. Rows inserted by a pod on the old mapping after change-set 215 ran carry classification only, and 215 never saw them. Without this they silently read as having no acuity the moment the fallback goes. Same shape as change-set 198-drop-ndc-pattern-id-1, which exists only because 193-2 missed rows for the identical reason (OR-2582).
# Reconcile rows where both columns are set and disagree. The sweep above does not touch them, and R3 discards whichever value the dropped column holds. The disagreement is ambiguous: a pod on the old mapping that changed the acuity left the fresher value in classification, while a pod on the new mapping that changed it left the fresher value in acuity. The columns alone cannot tell those apart and the second case is the common one, so preferring classification on a disagreement would revert good edits. Narrow the set by last_modified_date falling inside a window where old-mapping pods were still serving; there is one such window per rollout, so a rollback and roll forward opens another and needs its own pass over its own range. Outside those windows acuity is authoritative. An acuity an old-mapping pod cleared in such a window is not recoverable either way, because a deliberate null and a never-set null are the same value.
# Remove the classification field from Operation, remove the fallback from getAcuity(), and simplify setAcuity() back to a plain setter. The asymmetric clear exists only to stop the fallback resurfacing a stale value, so it goes with the fallback.
# Re-apply create_analytics_views.sql for mgb-mgh and mayo-mayo reading o.acuity alone, replacing COALESCE(o.acuity, o.classification). This is a hard prerequisite for R3, not a tidy-up.

h3. Also worth doing here

Once the fallback is gone, the Lombok @SuperBuilder step classification(String) disappears with the field. Until then it is a public way to bypass setAcuity(); only tests call it today.

## Comments (0)

(none)
