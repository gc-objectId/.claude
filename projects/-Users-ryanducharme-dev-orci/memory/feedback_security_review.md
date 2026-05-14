---
name: feedback-security-review
description: "Run /security-review before opening PRs that touch auth, file handling, or input validation — and verify guards fire at the right moment, not just that they exist"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4a812ec4-3077-4bf1-a7dd-663cbe3994b5
---

Run `/security-review` before opening any PR that touches authentication, file I/O, input validation, path handling, or ZIP/archive processing.

**Why:** On OR-2477, both a ZIP bomb guard and a path traversal guard were implemented with correct intent but wrong execution — `Files.copy()` blocks until the full entry is written before returning, so the byte-limit check fired after the damage was already done; the path guard checked `reportDir` when it should have checked `reportDir/playwright-report/`. Both bugs passed review because the *presence* of a guard was checked, not whether it fired at the right moment with the right value.

**How to apply:**
- For security-sensitive logic, trace actual values at runtime — don't just verify the structure looks right
- For I/O calls in particular: know whether a method blocks until completion before control returns to the check
- For path guards: verify the bound matches the intent exactly (one directory level wrong is exploitable)
- Write unit tests that exercise the guards directly (bad input → expected rejection) rather than relying on code review alone
