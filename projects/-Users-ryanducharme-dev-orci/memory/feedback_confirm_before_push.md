---
name: confirm-before-push
description: Always confirm with Ryan before git push or gh pr create — never do it autonomously
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0797fcbf-882f-47b1-b158-27035cce7f1e
---

Never run `git push` or `gh pr create` without explicit confirmation from Ryan. This has been violated twice in the same session (2026-05-13), the second time after already being corrected and saving this memory.

**Why:** Ryan needs to test changes locally before they are pushed. Pushing skips that gate. This is not a workflow preference — it is a hard rule. Violating it a second time after being corrected caused a serious breach of trust.

**How to apply:** After every commit, stop completely. Do not add push to the same command chain. Write "Ready to push — confirm?" and wait. If Ryan says "commit and push" in a single instruction, still separate the actions: commit, then ask before pushing. The word "push" in an instruction is not a blanket authorization — confirm each time, every time. No exceptions.
