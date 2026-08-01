---
name: mayo-data-lives-in-stage
description: Mayo tenant data is in stage RDS (mayo-mayo + pre-collapse mayo-rormc/mayo-rosmc); historical schemas store bare OR room names
metadata: 
  node_type: memory
  type: reference
  originSessionId: 06910925-6c03-47c0-8eee-36d01b0d97b1
  modified: 2026-07-31T19:37:41.603Z
---

Mayo integration data sits in the **stage** Aurora cluster, not dev — three schemas: `mayo-mayo` (the live mono tenant from OR-2633) plus the pre-collapse `mayo-rormc` and `mayo-rosmc`. Convenient, because [[query-rds-dev-secret-gap]] means the query-rds skill can't reach dev at all. Mayo was not yet in prod as of 2026-07-31.

The two generations of data differ in a way that silently breaks room-name parsing:

- `mayo-mayo` stores the **full Epic record name** — `RM OR 107 ROMB 01 528` (6 words; a few 5-word forms like `RM OR BEDSIDE ROEI 01`, `RM OR 216 ROMB XX`). Populated from HL7 SIU AIL-3-2.
- `mayo-rormc` / `mayo-rosmc` store **bare names** — `OR 10`, `OR 101`. Facility there is only recoverable from the schema itself (rormc = Methodist, rosmc = Saint Marys).

**How to apply:** any query deriving something positionally from `operating_room_name` works on `mayo-mayo` and silently yields NULL across ~80% of the historical schemas. Scope to `mayo-mayo` or add a schema-based fallback, and always report the NULL count so the gap is visible rather than assumed empty. See [[or2649-facility-derivation]].
