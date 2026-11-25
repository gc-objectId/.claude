---
name: or3204-startup-admin-token
description: "OR-3204 outcome — Theo's narrow PR #4878 (PR-gate-only startup admin token) won; Ryan's #4867 closed; trace scrub deferred as OR-3210"
metadata:
  node_type: memory
  type: project
  originSessionId: 61670fd0-1564-4253-9424-549e00aa7365
  modified: 2026-11-25T14:31:17.841Z
---

OR-3204 shipped as Theo's PR #4878 (approved by Ryan 2026-11-24): optional `admin.api.token` / `ADMIN_API_TOKEN`, used by the PR gate only. Dev and stage keep minting/revoking; the suite's mint path stays as the fallback.

Ryan's larger PR #4867 was closed unmerged 2026-11-24. OR-3209 (dev/stage tokens) closed as not needed. Worktree and local branch removed.

The credential scrub for published Playwright traces (passwords, session cookies, minted token in Actions artifacts) was deliberately not carried over — Theo: only if it proves to be an issue. Parked as OR-3210 `[DEFERRED]`; working code + tests live on `origin/feature/OR-3204-qa-startup-api-token` (`d56660f25`, `qa-suite/scripts/scrub-artifacts.mjs`). Don't delete that remote branch while OR-3210 is open.

Root cause of the wasted work: see [[feedback-check-stacked-prs-before-acting-on-review]].
