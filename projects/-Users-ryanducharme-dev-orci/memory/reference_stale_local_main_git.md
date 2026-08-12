---
name: reference_stale_local_main_git
description: Local main in ~/dev/orci can be 100+ commits behind origin; verify before asserting anything about production state
metadata: 
  node_type: memory
  type: reference
  originSessionId: d8910d06-6afc-48b0-9c08-7c2a11dbf065
  modified: 2026-08-11T22:48:14.644Z
---

`~/dev/orci` sits on `main` for long stretches without pulling — it was **153 commits behind origin/main** on 2026-08-11. Any claim about "what's on main today" drawn from the working tree can be badly wrong.

This nearly produced a false production-defect report: `PreopDoxycyclineCheckRule` still had its self-lockout locally (OR-2663's inert-rule bug), so it looked like the fix had never merged and the rule was still dead in production. On `origin/main` the fix was merged and the self-lock was gone.

**How to apply:** before asserting that code is or isn't on main — especially "this is broken in production" or "this ticket's fix never landed" — run:

```bash
git fetch origin --quiet
git rev-list --left-right --count main...origin/main   # right number = commits behind
git merge-base --is-ancestor <sha> origin/main && echo merged || echo "NOT merged"
```

Compare against `origin/main`, never local `main`. `git log --all -S "Foo"` finding a symbol proves only that it exists on *some* ref.

For a directory-wide scan of current main without disturbing the working tree (worktrees may be open, and `git checkout` in `~/dev/orci` is forbidden while they are), extract to scratch instead:

```bash
git archive origin/main <paths…> | tar -x -C "$SCRATCH/om"
```

Sibling trap for the running app rather than the source: [[reference_stale_local_app_build]].
