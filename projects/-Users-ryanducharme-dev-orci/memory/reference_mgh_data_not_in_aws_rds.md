---
name: reference_mgh_data_not_in_aws_rds
description: "MGH/MGB tenant data is not in our AWS RDS at all — it lives in MGB's self-hosted OpenShift Postgres, reachable only via MGB's Metabase"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 3e86876b-5537-4385-bdf1-2543901bc756
  modified: 2026-08-26T18:51:23.105Z
---

There is **no `mgb-mgh` tenant schema in any of our AWS Aurora environments**. Verified 2026-08-26 against dev, stage, and prod `guidedor` clusters — each holds only `demo-demo`, `demo-qa` (dev/stage), `mayo-mayo`, and `public`.

MGH runs on MGB's own self-hosted OpenShift deployment with its own Postgres, behind MGB's network. The `query-rds` skill cannot reach it in any environment.

The SQL under `orci/src/main/analytics/mgb-mgh/` is **authored** in this repo but **executed** in MGB's Metabase against their database — that is why those files reference `"mgb-mgh".operations`, `"mgb-mgh".mgb_event_notifications`, etc. even though those relations do not exist in our clusters.

**Why:** any MGH investigation that needs row-level data is not something I can run. Attempting `query-rds` against prod returns `relation "mgb-mgh.X" does not exist`, which reads like a wrong table name but is really a wrong-cluster error.

**How to apply:** for MGH data questions, write the query and hand it off for someone to run in MGB's Metabase — do not burn turns hunting for the right environment or secret. Contrast with [[reference_mayo_data_lives_in_stage]] (Mayo data really is in our stage cluster) and [[reference_query_rds_dev_secret_gap]]. Related: [[reference_analytics_sql_local_validation]] for validating these view files locally instead.
