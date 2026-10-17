---
name: reference-local-aws-tenant-shape
description: "Reproduce an AWS host's tenant shape locally (a tenant disabled AND its schema absent) with a throwaway DB + Redis index; and flip-check frontend code on a running spring-boot:run backend without rebuilding the jar"
metadata:
  node_type: memory
  type: reference
  originSessionId: b181ad04-8f11-4eef-80c9-235f15faafb1
  modified: 2026-10-16T16:51:54.189Z
---

**AWS tenant shape.** `-Dtenants.mgb.enabled=false` alone does not reproduce AWS: disabling only skips `CREATE SCHEMA`, and local Postgres already has `mgb-mgh`, so pre-fix code still answers 200 (and Redis may serve cached per-tenant data). Boot the worktree backend against a throwaway database and Redis index:

```
PGPASSWORD=orci psql -h localhost -U orci -d postgres -c "CREATE DATABASE orci_<ticket>"
SPRING_PROFILES_ACTIVE=local mvn -pl orci spring-boot:run -Dspring-boot.run.jvmArguments="-Dserver.port=808N -Duser.timezone=UTC \
  -Dtenants.mgb.enabled=false -Dtenants.demo.qa.enabled=true \
  -Dspring.datasource.url=jdbc:postgresql://localhost:5432/orci_<ticket> -Dspring.data.redis.database=7"
```

First boot on the empty DB ≈ 3 min (Liquibase + imports per enabled tenant); later boots ≈ 90 s. Side benefit: qa-suite's `globalSetup` resets `demo-qa` in the throwaway DB, not Ryan's. Redis pub/sub is not db-scoped, so guidance fan-out still crosses instances. qa-suite needs no env file for admin-only specs: pass `BASE_URL=… ADMIN_USERNAME=admin ADMIN_PASSWORD=admin TENANT_CLIENT_ID=demo-qa` inline (local admin password is the committed `admin.password: admin`).

**Frontend flip without a jar rebuild.** spring-boot:run serves the bundle from `orci/target/classes/static/` (copied there by `-P package-webapp`), and devtools does not restart on `/static/**`. So: edit src → `npm run build` in the webapp → `rsync -a --delete build/ ../../../target/classes/static/` → rerun the test. Pair with `expect.soft` on the absence assertions (and `--timeout=120000`) to see every one go red in a single run; revert with `git checkout --` once the real fix is committed.

**Port race recurred 2026-10-16** (OR-3074 took 8081 mid-boot): the readiness poll must also check the listener's `ps -o command=` contains this worktree, or it reads a sibling's app. See [[running-a-worktree-build-alongside-the-main-local-app]].
