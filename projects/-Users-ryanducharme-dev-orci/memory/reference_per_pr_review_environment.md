---
name: reference-per-pr-review-environment
description: "No per-PR review environment exists for orci; what exists (dev/stage/prod ECS, MGB TST/PROD) and the options for a reviewer-facing build of one branch"
metadata:
  node_type: memory
  type: reference
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
  modified: 2026-10-20T15:32:02.431Z
---

As of 2026-10-20 there is no per-PR or preview environment. `tools/deploy/src/guidedor_deploy/config.py` knows five
fixed targets: AWS dev, stage, prod (ECS clusters `guidedor-<env>`) and MGB OpenShift TST/PROD. AWS infra lives in
the `guidedclinical/guided-infrastructure` Terraform repo; each env under `environments/` is a full stack (VPC, ALB,
Aurora Serverless, ECS Fargate with app + Redis, Secrets Manager), so a new env there is real infra work.

Throwaway stacks that already exist but are not reviewer-reachable:
- `.github/pr-gate/compose.yml`: the PR's own image (built on the runner, never pushed) + fresh Postgres 16 + Valkey,
  `ci` profile with demo and mayo tenants enabled; job capped at 20 min.
- jira-watch (`~/.claude/jira-watch/compose-loop.yml`): Jib image of a ref (~40s warm) + tmpfs Postgres + Valkey on a
  free host port, per-run compose project. Same pattern could run any branch on Ryan's Mac.

Options for reviewers: (1) a dev window — deploy the branch with `maven-cd.yml`, hold main merges, safe only when the
branch has no migrations; (2) a lightweight "review" ECS service in dev's cluster with sidecar Postgres/Valkey and its
own ALB host rule + DNS, added in guided-infrastructure (a reusable preview capability, needs infra owner);
(3) local stack + tunnel — fast but exposes a build publicly unless the tunnel is private; a security call.

Also found: `tools/deploy/.../config.py` commits a Slack bot token and a Jira deployment webhook token as defaults.
Flagged to Ryan 2026-10-20; rotation + env-only is the fix. See [[empty-default-secret-auth-bypass]].
