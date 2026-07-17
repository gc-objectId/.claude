---
name: query-rds-dev-secret-gap
description: query-rds skill broken for dev — dev/guidedor secret has no database_read_only_password (stage/prod fine)
metadata: 
  node_type: memory
  type: reference
  originSessionId: 7db59caa-cbb0-46b3-b808-9206670a4ca0
---

The query-rds skill's env map assumes every `{env}/guidedor` secret contains `database_read_only_password`. As of 2026-07-16, `dev/guidedor` (last changed 2026-05-14) holds only epic JWKS/OAuth, sentry, and smtp keys — no DB credentials — so the skill fails for dev with a KeyError. `stage/guidedor` has the full key set and works. Dev RDS also requires the VPN (private IP).

**How to apply:** for dev data, prefer the app's admin API with qa-suite credentials (see [[gen-env-writes-file-directly]]), or fix the `dev/guidedor` secret / skill mapping.
