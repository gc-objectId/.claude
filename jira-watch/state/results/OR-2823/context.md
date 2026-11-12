# OR-2823 — R3: drop the operations.classification column

Status: Testing   Assignee: Ryan Ducharme

## Description

Release 3, the contract step. One change-set that drops operations.classification. It cannot be folded into R2.

h3. Two hard prerequisites

* R2 must be fully deployed with no pod left mapping the column. An R1 pod maps classification as a real field, so Hibernate puts it in every SELECT on operations. Dropping it while any such pod is alive fails every Operation read, which is the outage the whole expand/contract exists to avoid. This is why the drop cannot ride R2's own rollout.
* The analytics views must already be off the column (R2 step 4). While they reference it, DROP COLUMN refuses with a pg_depend error, and CASCADE drops every dependent view: 25 objects for mgb-mgh, 12 for mayo-mayo. Verified in a scratch schema.

h3. Shape

Follow change-set 198-drop-ndc-pattern-id-2: keep the drop in its own change-set so its ACCESS EXCLUSIVE lock is not held through any backfill, and guard it with a columnExists precondition so a re-run is a no-op.

Before dropping, confirm R2's reconciliation actually ran. Once the column is gone, any value it still held is unrecoverable.

## Comments (0)

(none)
