---
name: project-or3061-dev-banner-tests
description: "OR-3061 (Task under the design epic): dev banner host-rule WebMvcTest + AUTH-010 smoke test; DONE 2026-10-15, PR #4707 merged into the epic branch, worktree removed"
metadata:
  type: project
---

OR-3061 covers the "Development environment" banner: `ServerInfoControllerTest` (14 cases, `@WebMvcTest` with the real
`SecurityConfiguration`, anonymous requests) and AUTH-010 `[front-door R36, R38, R39]` (`@supplemental`). Also fixed a
500 on `/api/is-prod` for hosts `java.net.URI` parses to a null host (`localhost:abc`, `foo_bar`): `Set.of().contains(null)`
throws NPE. Draft [PR #4707](https://github.com/guidedclinical/orci/pull/4707) into `epic/OR-2863-design-foundation`,
merged 2026-10-15 19:59Z; ticket Done; worktree removed.

Ledger posted in the Jira comment and PR comment (never in the spec file): R36/R38/R39 Tested, R37/R47 Code only.
Next free smoke ID: AUTH-011. Known gap left alone: `[::1]` reads as production (loopback set is IPv4 only).

Validation recipe: `mvn -o -pl orci -DskipTests -P package-webapp install`, boot on a free 808N port with
`-Duser.timezone=UTC -Dtenants.demo.qa.enabled=true`, then `BASE_URL=http://localhost:808N npm run test:local -- --grep "AUTH-010" --project=smoke-auth --no-deps`.
See [[running-a-worktree-build-alongside-the-main-local-app]] for the port-collision lesson from this session.
