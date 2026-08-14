---
name: reference-empty-default-secret-auth-bypass
description: Giving a secret an empty default can turn a missing credential into an auth bypass — always read the consumer before defaulting
metadata: 
  node_type: memory
  type: reference
  originSessionId: bd1f948a-8413-4496-9bcd-5608ff2ef358
  modified: 2026-08-13T19:53:16.914Z
---

When replacing a committed secret with `${VAR:}` (empty default so local dev boots), read every consumer before assuming empty is safe. An empty secret can be *more* dangerous than a missing one, because code that compares a derived value will happily derive it from `""`.

Concrete case (OR-2653): `MGHEpicAuthController` authenticates by comparing caller-supplied values against `base64(SHA256(psk))` and `base64(SHA256(psk + epicSourceSeq))`. With `psk = ""` both are computable by anyone — `SHA256("")` is a published constant and the caller picks the sequence — so any `principalId` authenticates, including the hardcoded `ADMIN_USERS` (`ANMD`, `KC770`) that are auto-granted `ROLE_ADMIN`.

**"The tenant is disabled in that environment" does not gate an endpoint.** `/api/auth/mgh` is unconditionally `permitAll` in `SecurityConfiguration` and the `@RestController` registers regardless of `tenants.mgb.enabled`. Check the security config and whether the bean is conditional, not the tenant flag.

**How to apply:** for each secret getting an empty default, grep its property name for `@Value` / `@ConfigurationProperties` consumers and ask "what happens if this is empty?" Two fixes together: no default in every deployed profile (fails at startup), plus a fail-closed guard in the consumer so blank denies rather than authenticates. Config alone leaves the flaw latent for any future profile or a blank env var.

**Proving it:** the can-it-fail check must show the guard is what produces the denial. Forge credentials in the test the way an attacker would, then remove the guard and confirm the stack trace reaches *inside* the success branch past the credential comparison — that proves the bypass, whereas a downstream NPE alone could just be unwired test collaborators.

Related: [[feedback_security_review]], [[feedback_config_file_vigilance]]
