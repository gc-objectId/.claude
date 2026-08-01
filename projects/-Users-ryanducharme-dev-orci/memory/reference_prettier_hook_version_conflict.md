---
name: prettier-hook-version-conflict
description: "The pre-commit prettier hook pins an older prettier than qa-suite's local one — never run prettier --write over a whole pre-existing file"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 9927eda7-e654-4b05-b7fd-acdfab185889
  modified: 2026-07-31T19:41:13.716Z
---

`.pre-commit-config.yaml` pins `pre-commit/mirrors-prettier` at a fixed rev whose prettier version disagrees with `qa-suite`'s local prettier on some formatting. They fight, and the commit never lands: the hook rewrites the file, aborts the commit, you re-stage, and the local formatting comes back.

Seen on an arrow function inside `.find()` — local prettier wants `find((o) =>\n  body,\n)`, the hook wants `find(\n  (o) => body,\n)`.

**Rule: only run `npx prettier --write` on files you authored in this change.** Running it over a whole pre-existing file reformats untouched lines and can introduce exactly one disputed hunk that blocks every commit attempt.

**If a commit keeps failing on the hook:** read which file it names, `git diff` it, and hand-restore the disputed hunk to `main`'s style (the hook agrees with what's already committed). `npx prettier --check` will then flag that file locally — that's expected and fine; the hook is authoritative for committing.

Note the hook also realigns whole markdown tables, so a one-line table edit can show ~24 changed lines. Verify it's alignment-only rather than reverting it:

```bash
git show <sha> -- path/file.md | grep -E "^[+-]" | grep -v "^+++\|^---" | grep -vE "^[+-]\|"
```

Empty output means only table rows moved.

Related: [[or2641-mayo-intraop-observations]]
