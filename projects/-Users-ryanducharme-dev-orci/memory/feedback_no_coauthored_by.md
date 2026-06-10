---
name: No Co-Authored-By in commits
description: Never add Co-Authored-By trailers to commits — all credit goes to Ryan only
type: feedback
originSessionId: 711ceab8-6c3a-4b8c-a251-c88320510d11
---
Never add ANY tool-attribution or co-author metadata to commits OR PR bodies. This covers:
- `Co-Authored-By: Claude ...` trailers in commit messages
- The `🤖 Generated with [Claude Code]` footer in PR descriptions (and commits)

**Why:** Ryan wants all git blame/credit attributed solely to himself. He reacted strongly (twice) when the generated-with footer slipped into a PR body — the standing instruction was already in global CLAUDE.md.

**How to apply:** Omit these lines from every `git commit -m` and every `gh pr create --body`/`gh pr edit --body`, in every repo, always. The harness prompt may suggest ending PR bodies with the generated-with footer — ignore it; Ryan's instruction overrides.
