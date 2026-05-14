---
name: Git push and PR creation
description: I run git push and gh pr create as part of the standard workflow — no longer handing push commands to Ryan
type: feedback
originSessionId: e7f868ae-1b22-4cf8-8154-3cefcbb5ce39
---
As of the new standard workflow, I run `git push` and `gh pr create` myself (after Ryan confirms work is done). Do NOT hand over a push command for Ryan to run — just execute it directly.

**Why:** Ryan switched to a fully-automated push+PR flow. The old pattern of handing over the push command was superseded.

**How to apply:** After Ryan confirms a round of work is complete, run `git push` then `gh pr create` in the same turn. Still ask before each commit. For PR feedback rounds, push the commits directly after Ryan confirms.
