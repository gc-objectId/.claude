---
name: reference_timestamp_bind_zone_sensitivity
description: "Which ORCI writes actually drift under a non-UTC JVM — Instant fields do not, java.util.Date fields into zone-less columns do; how to reproduce both in psql and in the app"
metadata:
  node_type: memory
  type: reference
  originSessionId: b0822a53-7340-40ee-8642-10d0a2405f89
  modified: 2026-10-30T14:29:28.557Z
---

Measured on 2026-10-30 while validating OR-2809 with an `-Duser.timezone=America/New_York` JVM against the converged local DB:

- **`Instant` fields (BaseModel `created_date` etc.) never drift**, even into a column still `timestamp without time zone`: Hibernate binds them UTC-anchored, so `demo-demo.rule_not_fired_results.created_date` (still zone-less locally, >1000 rows) received the correct UTC instant.
- **`java.util.Date` fields drift** into a zone-less column: `patient_observations.effective_time` (a `Date`) posted as `14:32Z` was stored as `10:32` once the column was flipped back to `timestamp`; the same write into `timestamptz` stored `14:32+00`. This is the OR-2810 scope and the reason the timestamptz conversion matters at the app layer.
- psql reproduction of the pgjdbc path: `SET TIME ZONE 'America/New_York'; INSERT ... timestamptz '…+00'` into a `timestamp` column stores wall clock (4h off), into `timestamptz` stores the instant. An untyped string literal does **not** reproduce it (offset is simply dropped), so type the value.
- `ALTER COLUMN … TYPE timestamptz` with no `USING` under a non-UTC session shifts every stored value by the offset; under UTC it is catalog-only (relfilenode and epoch fingerprint unchanged). That is what the changeset/script session guard protects.

**How to apply:** an app-level red for "zone-dependent storage" needs a `Date`-backed column, not an `Instant` one. Flip one small converted column back to `timestamp` under a UTC session (catalog-only, fingerprint it), write through the Eastern JVM, then convert back under UTC. Pooled connections may answer `cached plan must not change result type` / "Unable to rollback" once after the ALTER and then recover.

Related: [[reference_liquibase_utc_guard_blocks_local_boot]], [[project_or2809_timestamptz_validation]]
