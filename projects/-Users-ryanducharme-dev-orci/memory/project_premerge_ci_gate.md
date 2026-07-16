---
name: project-premerge-ci-gate
description: "OR-2647 — pre-merge PR gate booting orci in CI with service containers, running qa-suite core tier; replaces ephemeral per-PR env idea"
metadata: 
  node_type: memory
  type: project
  originSessionId: e993ffa1-c4ff-4c35-97c4-b4d3a892c915
---

Ryan's goal of ephemeral per-PR environments (catch regressions before merge) was re-scoped on 2026-07-10 into OR-2647: a GitHub Actions PR check that boots the app inside the CI job (Postgres/Redis/Kafka service containers, `-P package-webapp` jar, CI profile) and runs the Playwright core tier against `localhost:8080`. No deployed infra — ephemeral by construction.

Key context:
- Feasibility investigation is the first AC item (AWS couplings at startup: S3, CloudWatch, Polly, Secrets Manager; runtime budget). Ticket closes as Won't Do if infeasible — Ryan deliberately skipped a separate spike ticket.
- If the gate lands, a follow-up ticket evaluates GitHub merge queue reuse of the same job (test merged result before main advances). Not ticketed yet.
- Motivating regression: OR-2645 (OR-2607 imported NONE antibiotic candidates with null rank → DTO `int rank` unboxing NPE → all rule evaluation 500s on dev). Companion lesson: PRs that change what data can exist need tests pushing the new shape through downstream consumers, not just the new feature.
- Related: OR-2646 — QA report screenshots/videos are on container-local disk only (OR-2487 moved just stats/history JSON to S3), so they 404 after every dev deploy.

The tag-based tier work ([[project-qa-suite-consolidation]], OR-2585) is what makes a fast required PR check viable (core tier only, path-filtered).

Implemented 2026-07-10 (PR #4098, draft): `.github/workflows/pr-gate.yml`. Feasibility confirmed — no Kafka anywhere in the repo (CLAUDE.md stack snapshot is stale), no AWS couplings at startup, only Postgres 14.5 + Redis containers needed. Total runtime ~13 min warm (build ~1.5 min, boot-to-ready ~6 min due to per-tenant Liquibase + CSV imports, core tier ~5 min). Design points learned the hard way:
- `public.ecr.aws/bitnami/redis` is dead — Redis starts via `docker run` step (official image needs `--requirepass` as a command arg, which service containers can't pass)
- Required-check-safe path filtering = `changes` job (dorny/paths-filter) + job-level `if`, NOT workflow-level `paths:`
- Fresh-DB gaps vs dev: `TENANTS_MAYO_ENABLED=true` env for MAYO tests; `MEDICATION_FAVORITES`/`MEDICATION_MACROS` flags seeded via SQL (`ENABLED_FOR_ALL` needs a past `enableDate` — `{}` evaluates false); demo-qa-user INSERT from tests-readme
- No GitHub secrets for the QA run — committed local-dev creds against the ephemeral backend
- Validation run reproduced OR-2645's NPE (live on main 2026-07-10, failing dev too). After the OR-2645 fix, the residual red (ARD-002, AF-003 core; NDC-003 supplemental) is OR-2661: OR-2607's no-antibiotic-recommended alert fires on the default fixture procedure (`p-gastro-uncomplicated`) and replaces the dosing form — test regressions, not app bugs. Gate goes green when OR-2661 is fixed. Remaining after merge: branch-protection required check on `PR Gate / gate`, merge-queue follow-up ticket. OR-2653 tracks the committed jasypt default (all ENC() values repo-decryptable), spun out of PR #4098 review.
