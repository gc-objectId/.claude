---
name: aurora-postgres-17
description: "Production Postgres is two majors — Aurora 17.7 (dev/stage/prod, us-east-2) and MGB self-hosted 16 on OpenShift; the repo pins postgres:16-alpine everywhere, the lowest production major"
metadata: 
  node_type: memory
  type: reference
  originSessionId: f08e354e-517e-4db4-8273-e166eefa7cf4
  modified: 2026-09-17T15:25:54.601Z
---

As of 2026-09-17 the three Aurora clusters (guidedor-dev/stage/prod-aurora-postgres, us-east-2) run
aurora-postgresql 17.7. MGB's self-hosted database on OpenShift runs a `postgresql-16` image (see
`orci/src/main/resources/mgb-openshift/deployments/postgres.yaml`). Check Aurora with:

```
aws rds describe-db-clusters --region us-east-2 --query 'DBClusters[].{id:DBClusterIdentifier,version:EngineVersion}' --output table
```

OR-2929 moved local compose from 14.5 to `postgres:16-alpine`, joining the five Testcontainers base
classes and `.github/pr-gate/compose.yml`, which were already on 16. `mgb-openshift/cronjobs/weekly-reports.yaml`
stays on `postgres:15`: that is a psql client image, not a server.

**Why:** with two majors in production, automated checks belong on the lowest. A feature present on 17
but not 16 would pass every test and break an MGB deploy; drift the other way is rare and Aurora
exercises it daily. Ryan questioned a first cut that moved tests and the gate to 17; it dropped the
only coverage of MGB's version.

**How to apply:** before changing any Postgres pin, enumerate every deployment target in the repo
(Aurora *and* the mgb-openshift manifests), not just the one a ticket names. Pin to the lowest
production major; add a higher lane only as an additive job. A data dir initialised by an older major
will not start under a newer one (`FATAL: database files are incompatible with server`); drop the
bind-mounted dir and let the app re-bootstrap. Ryan's own local container bound
`~/dev/orci/orci/postgres-data`, not the compose default, so `docker inspect postgres` first.
