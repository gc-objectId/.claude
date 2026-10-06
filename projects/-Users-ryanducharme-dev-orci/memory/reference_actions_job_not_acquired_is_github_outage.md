---
name: actions-job-not-acquired-is-github-outage
description: "A GitHub Actions job that ends \"cancelled\" with no steps run and the annotation \"The job was not acquired by Runner of type hosted even after multiple attempts\" is a GitHub-hosted runner outage, not a concurrency or workflow problem"
metadata:
  node_type: memory
  type: reference
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
  modified: 2026-10-05T21:21:49.686Z
---

Seen 2026-10-05 during a GitHub Actions major outage (githubstatus.com, "Incident with Actions", from 19:11 UTC):
every `ubuntu-latest` job in the repo queued ~15 min and then showed `gate: cancelled` with zero steps, runner
name empty, and the annotation above. Two `workflow_dispatch` runs of the PR gate on the epic branch died this
way, as did a PR's own gate and the auto-resolve and Jira Autofix workflows.

**Why:** don't chase the concurrency group or the workflow file; nothing in the repo cancelled it. Check
`https://www.githubstatus.com/api/v2/summary.json` (WebFetch works) for an Actions incident first.

**How to apply:** `gh run view <id>` shows the annotation under ANNOTATIONS; `gh api
repos/<org>/<repo>/actions/runs/<id>/jobs` shows `runner_name` empty and no steps. Re-dispatch after the
incident resolves; a run cancelled this way proves nothing about the branch. A `gh run watch` needs restarting
every 10 min anyway (background task cap).
