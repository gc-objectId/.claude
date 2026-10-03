---
name: github-runs-api-stale-pages
description: "GitHub's workflow-runs listing API intermittently serves pages that are weeks stale; verify freshness by checking the current run id is present before trusting it"
metadata:
  node_type: memory
  type: reference
  originSessionId: 53b4c78d-b896-4459-822b-8e9164de3faa
  modified: 2026-10-02T14:29:02.981Z
---

`GET /repos/{repo}/actions/workflows/{file}/runs` is served from eventually-consistent replicas. On 2026-10-02 it returned a page ending 2026-09-17 (15 days stale) to the PR #4607 QA Suite run, and probing six calls per filter variant (`status=success`, `branch=main`, `event=workflow_run`, unfiltered) showed the stale page appearing intermittently on each — no query string avoids it.

**Why:** a stale page silently moves any "since last green" baseline back weeks, inflating commit counts (101 vs 2 for OR-2989). The result looks plausible, so nothing flags it.

**How to apply:** when a workflow step reads the runs listing, treat the page as fresh only if it contains the current run's own id (`GITHUB_RUN_ID`); retry a few times and degrade to "no range" rather than post a wrong one. `.github/scripts/qa-suite-slack-payload.mjs` `recentRuns()` is the reference implementation. Also use `git log --first-parent` for "merges since X" on main; a plain range counts every commit on every merged branch. 
