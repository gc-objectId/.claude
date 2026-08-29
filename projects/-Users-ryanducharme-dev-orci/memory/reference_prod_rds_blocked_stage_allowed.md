---
name: reference-prod-rds-blocked-stage-allowed
description: Auto mode's classifier blocks prod RDS reads but allows stage; stage mayo-mayo is nearly empty so it cannot answer prod data questions
metadata:
  type: reference
---

In auto mode the Claude Code classifier denies `prod/guidedor` psql reads (both the inline
query-rds pattern and the skill itself), while the identical command against `stage/guidedor`
goes through. The denial is on the prod environment specifically, not the command shape.

Stage is not a fallback for Mayo data questions: `"mayo-mayo"` in stage carries the full
analytics layer (views + both rollup matviews) but only ~20 firing facts and ~150
`rule_fired_results`. It is good for schema/config checks — e.g. confirming a medication's
`medication_categories` after a config change — and useless for attributing production numbers.

Stage also sits behind the VPN and will start timing out mid-session when it drops.

**Why:** a deep dive on prod metrics stalls without either a Bash permission rule for the prod
psql pattern in `.claude/settings.local.json`, or Ryan running the query himself via `!`.

**How to apply:** for prod-data questions, plan on handing Ryan a runnable artifact (a Metabase
SQL file, or the `!` command) rather than expecting to run it. Use stage only to verify schema
and seeded config. See [[reference_query_rds_dev_secret_gap]] and
[[reference_analytics_sql_local_validation]].
