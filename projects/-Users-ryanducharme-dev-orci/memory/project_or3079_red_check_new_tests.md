---
name: project-or3079-red-check-new-tests
description: "OR-3079 red-check of the design epic's new qa-suite logic — DONE 2026-10-16, PR #4716 merged into the epic (7a2c707ed), worktree removed"
metadata:
  node_type: memory
  type: project
  originSessionId: 90e71c3b-3411-4986-9a6a-b989c7db0538
  modified: 2026-10-16T15:20:29.287Z
---

OR-3079 (Task under the design epic, To Do → IMPLEMENT), worktree `~/dev/worktrees/OR-3079-red-check-new-tests`,
branch reset onto the epic tip a8d76b382. Draft [PR #4716](https://github.com/guidedclinical/orci/pull/4716) opened 2026-10-16 (head 1fd1c7639), Jira
implementation comment posted, ticket In Progress. Backend 8081 from the worktree (java PID 12831, mvn PID 12754).

Findings: LAUNCH-005 (now LAUNCH-013) Ctrl+Shift+A and LAUNCH-007 Ctrl+D checks went red 3/3 even unanchored (React commits the
hotkey update before `press` returns) — anchored on opening Settings anyway; AUTH-010 reload check anchored on the
`/api/is-prod` response; SIM-006 error path was genuinely weak (Generate blanks the `<pre>` in flight, so
`not.toContainText` passed 2/3 with the 500 removed) → `toHaveText("simulation failed")`; `not.toHaveCount(1)`
option waits (SIM-003/010, VIS-033) pass with no select → exact count / `expect.poll(count) > 1`; VIS-012/030
`.skeleton` waits were vacuous (`.skeleton` only renders in FavoritesSidebar) → removed.

Red-check record is in the PR description. Merged 2026-10-16 16:08Z into the epic as 7a2c707ed; 8081 stopped,
`worktree-done` exit 0, ticket Done.
See [[or2863-child-session-sop]], [[app-level-flip-by-bundle-swap]].
