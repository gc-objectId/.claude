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

Reinforced 2026-07-10 on the OR-2647 workflow (PR #4098): applies equally to CI/workflow YAML — no "runtime levers" narration, no performance-tradeoff justification, no dead-image history in comments. That story lives in the PR description and commit messages.

Reinforced 2026-07-16 on OR-2661 (PR #4120): wrote 3-line comments and wordy companion-doc parentheticals to justify a one-line fixture choice. Fixed to one line each. Rule is now codified in global CLAUDE.md (Code Quality → Comments); Ryan chose not to change the repo CLAUDE.md. Treat any comment over one line as a defect unless the constraint genuinely can't fit.

Related: [[terse-no-summaries]]
