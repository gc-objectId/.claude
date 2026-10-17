---
name: project_or2988_asa_demo_lag
description: "OR-2988 ASA demo \"no lag\" — no code shipped under it; left for Alex/Theo to close; scan-lag fix is #4664"
metadata:
  node_type: memory
  type: project
  originSessionId: f93eb2b8-057b-45d5-9eee-682a4c681672
  modified: 2026-10-16T14:26:24.554Z
---

OR-2988 (ASA demo: faster version/no lag) has no PR or commits. Theo moved it To Do → Ready for Testing on 2026-10-15 to close it out. On 2026-10-16 Ryan chose to post nothing and leave the close to Alex/Theo. It is in Testing, assigned to Ryan, and the worktree has no commits.

- The April "faster version" for the 2026-04-09 Mayo TST demo was not a demo build. It was Jordan's N+1/caching fixes merged to main on 2026-04-06 (#3720–#3722).
- The scan-lag fix is Theo's #4664 (rule feature flags resolved once per evaluation), merged 2026-10-14 after 0.1.102 was cut. So it's on dev but not in a release.

**Why:** if OR-2988 comes back, don't re-derive this or validate it as a feature.
**How to apply:** if asked to close it, check whether Alex/Theo already did; tear down the empty worktree with `worktree-done`.
