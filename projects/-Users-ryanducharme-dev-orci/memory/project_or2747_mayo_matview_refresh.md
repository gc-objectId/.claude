---
name: project-or2747-mayo-matview-refresh
description: "OR-2747 Mayo rollup nightly refresh — shipped as a prod-only Lambda (04:00 US/Central) + MAINTAIN-only role; mechanism validated locally 2026-10-29, prod runtime evidence needs Ryan"
metadata:
  node_type: memory
  type: project
  originSessionId: 44c8d3ec-4ba2-4726-bc18-7a9d8c3ce039
  modified: 2026-10-29T14:00:42.120Z
---

Mayo error rate (Metabase card 55) reads two materialized views in `"mayo-mayo"`:
`mayo_shared_metric_firing_daily_rollup_mv` and `mayo_shared_metric_med_admin_daily_rollup_mv`.

**What shipped (Sept 2026):** orci #4489 (unique `NULLS NOT DISTINCT` indexes so the rollups
refresh `CONCURRENTLY`, `orci_analytics_refresh` role with USAGE + MAINTAIN only, catalog-driven
re-grant at the end of `create_analytics_views.sql`) and guided-infrastructure #150 (VPC Lambda
`guidedor-prod-analytics-refresh`, EventBridge Scheduler `cron(0 4 * * ? *)` in US/Central,
handler discovers what to refresh from the MAINTAIN grants; zero grants raises). **Prod only** —
dev/stage default `analytics_refresh_enabled = false` (infra commit "Deploy the rollup refresh in
prod only"); the module README's "every environment opts in" paragraph is stale.

**Validated 2026-10-29 (local, PG17 container, shipped SQL verbatim + real handler.py with boto3
and TLS stubbed):** bootstrap order works on a bare schema; role refreshes but cannot SELECT
anything; CONCURRENTLY completes under a reader where plain REFRESH hits lock_timeout; dropping
the unique index / revoking MAINTAIN both go red and the re-run of create_analytics_views.sql
restores the grant. Harness pattern: wrap `pg8000.native.Connection` to force the port (the
handler passes `port=5432` explicitly, so a partial won't do) and set `_ssl_context = lambda: None`.

**Closed 2026-10-30.** Ryan ran the prod catalog query over VPN: role, both unique indexes, MAINTAIN on both rollups present; rollup `last_autoanalyze` = 2026-10-29 09:00 UTC = 04:00 Central, i.e. the refresh wrote rows at the schedule slot. That autoanalyze timestamp is the cheapest freshness probe for the matviews. Automation (PG17 Testcontainers test) still pending Ryan's decision.

**Blind spots:** Ryan's IAM user cannot list Lambdas/schedules/logs, prod catalog reads are denied
by the auto-mode classifier, and stage does not run the job. Prod bootstrap (secret populated,
role created) and nightly success can only be confirmed by Ryan: CloudWatch
`/aws/lambda/guidedor-prod-analytics-refresh`, or a `!` catalog query for the role/grants/indexes.

**Gotchas:** `GRANT MAINTAIN` is PG17+; the repo pins `postgres:16-alpine` everywhere (compose,
CI, Testcontainers) while Aurora runs 17.7, so any automated test of these files needs its own
17 image. The query-rds keyword guard rejects a SELECT whose string literal says CREATE TABLE.

Related: [[project_or2734_nmb_clipping_unfixed]], [[reference_analytics_sql_local_validation]],
[[reference_prod_rds_blocked_stage_allowed]].
