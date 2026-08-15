---
name: reference-analytics-sql-local-validation
description: How to validate orci analytics view SQL without RDS access — isolated local fixture DB running the shipped create_analytics_views.sql
metadata: 
  node_type: memory
  type: reference
  originSessionId: b7394630-9c24-4cd5-8573-951edc7e6bd2
  modified: 2026-08-14T18:55:52.386Z
---

Analytics views under `orci/src/main/analytics/{org}/` can be validated end-to-end on local
Postgres with no RDS access. Create a throwaway database, hand-write minimal DDL for only the
base tables the file references (`grep -oE '"(mayo-mayo|public)"\.[a-z_]+'` enumerates them —
about 9 for mayo-mayo), load fixture rows, then run the **shipped** file verbatim with
`psql -f`. It sets its own `search_path` and drops/recreates everything, so it runs clean
against a bare schema and also proves the SQL parses.

Drive assertions from an `expectations(firing_id, label, expect_present, why)` table LEFT
JOINed against the view — one PASS/FAIL row per scenario. Flip-and-revert by re-issuing
`CREATE OR REPLACE VIEW` with a mutated predicate (a plpgsql helper taking the predicate
fragment as text keeps the variants to one line each); dependent views survive as long as the
column list is unchanged.

`query-rds` prod reads may be blocked by the permission classifier while **stage** connects
fine, and stage carries real Mayo data — see [[reference_mayo_data_lives_in_stage]]. Use it to
confirm the premise a predicate rests on (column populated, no NULLs, no disagreement with the
source being replaced) even when the row counts are too small to reproduce prod figures.

Local Postgres: `postgresql://localhost:5432/postgres` u:orci p:orci. Drop the scratch DB after.
