---
name: reference-liquibase-utc-guard-blocks-local-boot
description: Changesets 039/040 (OR-2809 timestamptz) refuse to run on a non-UTC dev machine because pgjdbc sets the session TimeZone from the JVM default
metadata:
  type: reference
---

Local app boot dies in Liquibase with `session TimeZone is America/New_York, not UTC. Refusing to convert public.`
from changeset `039-converge-timestamptz` (and `040-timestamptz-hl7-deadletter-messages` right behind it).

The local Postgres server is UTC. The non-UTC session comes from **pgjdbc**, which issues a
`SET SESSION TimeZone` to the JVM default timezone on every connect. An Eastern-time Mac therefore
gets `America/New_York` on every Liquibase connection.

Unblock local boot:
`mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Duser.timezone=UTC"` (IDE: same flag in VM options).
This matches production containers and surefire, which already pins `-Duser.timezone=UTC` in `pom.xml` `argLine`.

Why the changesets have the bug: they were ported from `bin/or-2809-convert-timestamptz.sh`, whose
*generated SQL* does `SET TIME ZONE 'UTC'` first, so its `RAISE EXCEPTION` is only a re-check. The
changesets carried the check but not the `SET`, and they borrow the app's session. Deployed containers
run UTC, so CI and dev never caught it.

Both changesets were already executed in dev (auto-deploy on merge to main), so an in-place SQL edit
changes the md5 and fails validation on the next dev deploy — pair any fix with `<validCheckSum>ANY</validCheckSum>`
rather than reaching for `bin/clear-liquibase-checksums.sh`, which is a local hand tool reading repo-root
`liquibase.properties`.

Caveat before "just force UTC": `ALTER COLUMN ... TYPE timestamptz` with no `USING` reads naked timestamps
*as* the session zone, and `application.yml` notes `jdbc.time_zone: UTC` is a dead key (the real one is
`hibernate.jdbc.time_zone`). If the app has been binding local wall clock, the chosen zone changes the
resulting instants. Moot on UTC servers, not moot on a local DB with real rows.

Related: [[reference_mayo_hl7_test_tz_coupling]], [[reference_stale_local_app_build]]
