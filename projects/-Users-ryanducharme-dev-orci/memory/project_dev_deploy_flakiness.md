---
name: dev-deploy-flakiness
description: "Dev ECS deploys time out in CI but converge on their own — OR-2662; don't rerun failed deploy jobs"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4e34f6bf-6960-40a7-8de5-9b9129f01208
---

Since 2026-07-14, every Build & Deploy to Dev run fails at "Deploy to ECS" (900s stabilize timeout, `tools/deploy/src/guidedor_deploy/services/aws.py:22`) even though the ECS rollout converges afterwards. Tracked in OR-2662 (created 2026-07-16, linked to OR-991 and OR-1528).

**Mechanism:** app boot on dev intermittently exceeds the container health-check window (startPeriod 300s + 3×30s ≈ 390s) / ALB grace (600s) → task killed mid-boot → retry cycle blows the 900s CI budget.

**Why:** it matters for triage — a "failed" deploy usually still lands; check `aws ecs describe-services --cluster guidedor-dev --services guidedor-dev` for rollout state before assuming dev is stale.

**How to apply:**
- Don't rerun failed deploy jobs — image is usually already rolled out; a rerun causes another rollout and another mixed-version window.
- Blank white pages on dev (incl. login) during/after deploys = mixed-version tasks serving mismatched hashed JS chunks; resolves when rollout completes.
- QA Suite is gated on deploy success, so it's skipped on these false failures — dispatch manually via workflow_dispatch once the service is steady.
- My IAM user has no CloudWatch logs read (`logs:FilterLogEvents` denied) and no elbv2 describe — boot-time investigation needs console access.
- Container health check curl lacks `-f` (503 readiness passes); noted in [[dev-deploy-flakiness]] ticket OR-2662.
