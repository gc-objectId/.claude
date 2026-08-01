---
name: stale-local-app-build
description: Validating against localhost can silently test a days-old build — check JVM start time vs the commit dates of the code under test
metadata: 
  node_type: memory
  type: reference
  originSessionId: 9927eda7-e654-4b05-b7fd-acdfab185889
  modified: 2026-07-31T19:40:58.539Z
---

The app on `localhost:8080` can be running a build from days earlier than the checked-out source, so "validated against main locally" may silently be validating a stale build. Hit during OR-2641: the JVM had started 2026-07-28, but the flowsheet behavior under test changed 2026-07-30 — the live probe showed pre-change behavior and looked like a product bug.

**Check before trusting a local validation run:**

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN          # get the PID
ps -o lstart=,etime= -p <PID>             # when did the JVM actually start
git log -1 --format="%h %ad %s" --date=iso <commit-under-test>
```

If the process predates the commit, either ask Ryan to rebuild+restart, or verify at the unit level against the worktree source instead. Don't restart `~/dev/orci` yourself — another session may own it.

**Related trap that produced a false negative in the same session:** the Bash tool's working directory *persists across calls*, so an earlier `cd qa-suite` made a later `git diff <sha> origin/main -- <repo-relative-paths>` match nothing and print empty — which read as "no difference" and wrongly cleared the running build. Use absolute paths in `git diff`/`find` pathspecs, or `cd` to the worktree root in the same command.

Related: [[or2641-mayo-intraop-observations]], [[feedback_validate_against_main]], [[feedback_validation_protocol]]
