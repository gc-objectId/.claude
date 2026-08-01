---
name: query-rds-dev-secret-gap
description: query-rds dev gap is CLOSED — dev/guidedor gained DB creds on 2026-07-20 via infra secret-parity work
metadata: 
  node_type: memory
  type: reference
  originSessionId: 7db59caa-cbb0-46b3-b808-9206670a4ca0
  modified: 2026-07-31T21:28:13.403Z
---

Resolved as of 2026-07-20. `dev/guidedor` previously (last changed 2026-05-14) held only epic JWKS/OAuth, sentry, and smtp keys, so the query-rds skill failed for dev with a KeyError on `database_read_only_password`. Infra PR #105 (`secret-parity-dev`, merged 2026-07-24 but applied 2026-07-20) consolidated dev onto the stage pattern and added `database_username`, `database_password`, `database_read_only_password`, `redis_password`, and `admin_password` to the secret.

Dev RDS still requires the VPN (private IP) — that part is unchanged.

**How to apply:** query-rds should now work for dev; if it fails, it's the VPN, not a missing key. Verified while validating [[or2616-dev-smtp-not-rotated]].
