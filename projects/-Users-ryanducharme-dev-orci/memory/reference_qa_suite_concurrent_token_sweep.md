---
name: qa-suite-concurrent-token-sweep
description: "Two qa-suite runs against one backend revoke each other's admin API token mid-run (401s); a failed cleanup then poisons the next run's \"original\" snapshot"
metadata:
  node_type: memory
  type: reference
  originSessionId: 2912e250-e5ba-470b-816d-c8ba14822e2b
  modified: 2026-10-17T08:45:02.531Z
---

`global-setup.ts` revokes every `qa-suite`-labelled token except its own, with no age check. Two sessions running qa-suite against Ryan's shared 8080 (e.g. sibling epic worktrees) kill each other's token: API setup/cleanup fail with 401 and teardown logs "Failed to revoke admin API token (401)".

**Why it matters:** a test that snapshots state, edits it, and restores in `finally` loses the restore to the 401, and the next run snapshots the leftover as its "original" — OR-3072's FLAG-001 left `RULE:a-remifentanil-high-dose` disabled for demo-qa until restored through the API (a direct DB write leaves the Spring `featureFlags` cache stale).

**How to apply:** before any qa-suite run against 8080, check `ps -eo command | grep "playwright test"` for other worktrees and wait for a quiet window; after a 401 run, check `public.feature_flags` / `public.release_notes` for leftovers. The durable fix is OR-3086 (OR-3088 closed 2026-10-19 as its duplicate; OR-3086 also covers the tenant reset in the same setup step). A watcher that greps `ps` for "playwright test" matches its own command line and never sees quiet — exclude its PID. Related: [[or2863-child-session-sop]].
