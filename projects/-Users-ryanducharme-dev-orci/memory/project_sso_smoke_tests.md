---
name: SSO smoke test coverage needed
description: Smoke tests only cover form-based auth; clients use M365 SSO in production — need SSO login flow tests
type: project
---

Current smoke auth tests (SMK-003) only exercise form-based login, which is used by internal test users. Production clients authenticate via SSO (M365).

**Why:** Theo flagged that form-based auth tests don't cover the real client login path. SSO integration is a gap in smoke test coverage.

**How to apply:** When expanding smoke test coverage, prioritize adding an SSO/M365 login flow test. This will likely require a test IdP or M365 test tenant to be configured.
