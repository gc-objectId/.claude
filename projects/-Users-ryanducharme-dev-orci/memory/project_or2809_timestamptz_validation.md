---
name: project_or2809_timestamptz_validation
description: "OR-2809 timestamptz schema conversion — validated deploy-ready and moved to Done 2026-10-30; tests PR #4802 (TemporalColumnTypeTest) open as draft; worktree-done still owed after merge"
metadata:
  node_type: memory
  type: project
  originSessionId: b0822a53-7340-40ee-8642-10d0a2405f89
  modified: 2026-10-30T14:34:25.021Z
---

OR-2809 (Task under the Postgres "Don't Do This" epic): nine-PR chain by Theo, merged 2026-08-25 to 2026-09-09, prod migrated by 2026-09-09. Validated on 2026-10-30 against a local build of `main` f526d1b9e; ticket moved to Done at the deploy-ready verdict.

State of the world: stage has zero zone-less columns in all four schemas; a fresh Liquibase replay ends with zero in public plus every tenant schema; an established DB keeps only tables over the 1000-row bound in `041`/`225` (locally `rule_not_fired_results` in demo-demo and mayo-mayo) for the M5a operator script. Retired pre-collapse schemas (`mayo-rormc`, `mayo-rosmc`) never get the tenant changelog and stay zone-less — not a defect, they are not tenants.

Open items noted, not blockers: MGB OpenShift manifest sets no explicit `TZ` (base-image default, JVM flags in a secret); Metabase report timezone not in repo; AWS `TZ=UTC` lives in Terraform outside the repo.

Automation: `TemporalColumnTypeTest` on `AbstractIntegrationTest`, draft PR #4802 from worktree `OR-2809-timestamptz-schema-update`. After merge: `worktree-done` from that worktree.

Validation mechanics worth reusing: [[reference_timestamp_bind_zone_sensitivity]], [[reference_liquibase_utc_guard_blocks_local_boot]], [[reference_devtools_restart_on_mvn_test]].
