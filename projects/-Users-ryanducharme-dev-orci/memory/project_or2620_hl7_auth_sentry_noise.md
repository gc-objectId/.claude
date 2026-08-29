---
name: project_or2620_hl7_auth_sentry_noise
description: OR-2620 DONE — HL7 auth failures log WARN unconditionally; Sentry reopens a Done ticket when a new event hits a resolved issue
metadata: 
  node_type: memory
  type: project
  originSessionId: 1ba0626d-1f4d-4270-b330-95e4369282f2
  modified: 2026-08-28T19:41:55.093Z
---

OR-2620 (merged 2026-08-28, PR #4496): the HL7 auth entry point in `SecurityConfiguration`
logs **WARN unconditionally**. `APITokenAuthenticationProvider` is back to its pre-PR-#4162
state — the DEMO-credential classifier and `NonProdCredentialAuthenticationException` are gone.

**Why the first fix (#4162) failed.** It quieted a failure only when the presented token
resolved to a DEMO-org row, via `findByTokenAndTokenType(token, TYPE)`. qa-suite `TTOK-010`
(DEMO org token on the tenant path) and `TTOK-011` (DEMO tenant token on the org path)
present *real* DEMO tokens under the *wrong type*, so the typed lookup misses, the
classifier gets null, and it logged ERROR. Both are `@core` and run on every dev deploy.

**Why:** any discriminator that tries to identify "our own traffic" by inspecting the
credential is leaky — a token absent from the store defeats it too, so internet scanners
refile the ticket as readily as CI. The durable rule: an `AuthenticationEntryPoint` is
reached only when a *client* failed to authenticate, which is 4xx and never pageable. A
token-store fault throws `DataAccessException`, not an `AuthenticationException`, so it
never reaches the entry point — it becomes a 500, captured separately. There was no
reachable case for ERROR.

**How to apply:**
- Don't re-add severity branching to that entry point. Detection of a sustained attack
  belongs in a rate alarm on the log pattern (OR-2852), not per-event severity.
- **Sentry reopens Done tickets.** Marking a ticket Done resolves the linked Sentry issue;
  the next event is treated as a regression and transitions the ticket back to To Do. This
  is why OR-2620 bounced 8h after its 2026-07-31 close-out. Before closing a
  Sentry-filed ticket, check whether events are still arriving from the pre-fix build, and
  resolve the Sentry issue only after the fix deploys.
- Mayo is the inbound HL7 client; MGB does not use that controller. Tests of this path
  should model `TenantKey.MAYO` and derive keys from the `TenantKey` constants — the cases
  depend on `TenantKey.parse()` picking tenant vs org path, so a drifted literal reroutes
  the case silently instead of failing.

See [[reference_hl7_admin_send_validation_path]], [[reference_rule_definitions_rebuilt_on_boot]].
