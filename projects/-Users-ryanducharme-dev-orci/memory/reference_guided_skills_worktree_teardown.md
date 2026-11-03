---
name: guided-skills-worktree-teardown
description: worktree-done only tears down orci worktrees under ~/dev/worktrees; guided-skills worktrees (~/dev/guided-skills-*) need plain git
metadata:
  node_type: memory
  type: reference
  originSessionId: 861319e7-e94d-4388-9912-c939d9b286ed
  modified: 2026-11-02T15:54:50.193Z
---

`worktree-done` calls `~/.claude/bin/worktree-teardown.sh`, which aborts on any directory outside
`~/dev/worktrees` and runs its git commands against `~/dev/orci`. A guided-skills worktree such as
`~/dev/guided-skills-OR-2901` sits beside the repo at `~/dev/guided-skills`, so tear it down by hand:

```bash
G=~/dev/guided-skills; B=<branch>
git -C $G fetch -q --prune origin && git -C $G merge-base --is-ancestor $B origin/main \
  && git -C $G worktree remove <worktree-dir> && (git -C $G branch -d $B || git -C $G branch -D $B)
```

`branch -d` usually refuses because the local main is stale and the remote branch is deleted on merge;
the `--is-ancestor` check against origin/main is what makes the `-D` fallback safe. Ignored caches
(`__pycache__`, `.pytest_cache`) don't block `worktree remove`.

Related: [[worktree-done-false-success]], [[or2901-procedure-mapping-skill]].
