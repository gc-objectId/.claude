---
name: concise-code-comments
description: "Theo flagged Ryan's PRs for verbose comments — keep code comments to one line stating the constraint, never reviewer-directed justification"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 60db3a7f-4d1f-47ac-8015-aaa66c56fc87
---

Theo (reviewer) flagged Ryan's PRs as having too-verbose comments (2026-07-09, first surfaced on the Mayo test PRs).

**Why:** My multi-line comments tend to *justify the code to a reviewer* ("this proves X — a broken path would surface Y, so this cannot pass on Z") rather than state the one constraint the next reader needs. Justification belongs in the PR description; it's noise the moment the PR merges. The repo CLAUDE.md codifies this: comments describe intended behavior and motivation from first principles, no historical baggage, not needlessly verbose.

**How to apply:** Default to zero comments; when one is warranted, one line stating the non-obvious constraint (e.g. "Exact message distinguishes not-found from OAuth failures."). Never restate the test name or narrate what the next line does. Cross-references to docs (file names) are fine. Same discipline in qa-suite companion .md files — skip boilerplate sections that don't carry test-specific content.

Related: [[terse-no-summaries]]
