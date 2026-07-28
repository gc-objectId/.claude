---
name: concise-code-comments
description: "Theo flagged Ryan's PRs for verbose comments — keep code comments to one line stating the constraint, never reviewer-directed justification"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 60db3a7f-4d1f-47ac-8015-aaa66c56fc87
  modified: 2026-07-27T20:55:22.916Z
---

Theo (reviewer) flagged Ryan's PRs as having too-verbose comments (2026-07-09, first surfaced on the Mayo test PRs).

**Why:** My multi-line comments tend to *justify the code to a reviewer* ("this proves X — a broken path would surface Y, so this cannot pass on Z") rather than state the one constraint the next reader needs. Justification belongs in the PR description; it's noise the moment the PR merges. The repo CLAUDE.md codifies this: comments describe intended behavior and motivation from first principles, no historical baggage, not needlessly verbose.

**How to apply:** Default to zero comments; when one is warranted, one line stating the non-obvious constraint (e.g. "Exact message distinguishes not-found from OAuth failures."). Never restate the test name or narrate what the next line does. Cross-references to docs (file names) are fine. Same discipline in qa-suite companion .md files — skip boilerplate sections that don't carry test-specific content.

Reinforced 2026-07-10 on the OR-2647 workflow (PR #4098): applies equally to CI/workflow YAML — no "runtime levers" narration, no performance-tradeoff justification, no dead-image history in comments. That story lives in the PR description and commit messages.

Reinforced 2026-07-16 on OR-2661 (PR #4120): wrote 3-line comments and wordy companion-doc parentheticals to justify a one-line fixture choice. Fixed to one line each. Rule is now codified in global CLAUDE.md (Code Quality → Comments); Ryan chose not to change the repo CLAUDE.md. Treat any comment over one line as a defect unless the constraint genuinely can't fit.

Reinforced 2026-07-17 on OR-2555 (PR #4124): **no ticket numbers in code comments unless absolutely necessary** — includes section-divider comments in spec files (`// --- OR-XXXX: ... ---` → `// --- Feature ---`). Traceability lives in commits/PRs/companion docs. Added to global CLAUDE.md Comments section.

Reinforced 2026-07-23 on OR-2526 (PR #4188): wrote a 5-line test-class javadoc explaining what coverage was missing and what the comparison suite omits — reviewer-talk again, this time in javadoc form (javadoc counts as a code comment). Ryan's calibration: comments **can** be long when the constraint genuinely needs it — the test is *purpose*, not a hard line cap. Ask: does this document the code (constraint/invariant/non-obvious behavior), or address the reviewer (justify the change, compare to other files, record what was missing)? The latter always goes to the PR/Jira regardless of length. A pre-commit comment sweep is now step 1 of the workon green-light close-out.

Reinforced 2026-07-23 on OR-2612 (PR #4192, "DEEP EYEROLL"): the green-light comment sweep ran and **passed my own comments** — an 11-line block narrating what the tests do (that's the companion .md's job), plus multi-line notes restating the assertions directly below them. The sweep failed because I graded against the file's existing verbose comments ("matches ARD-003/004 convention") instead of the rule. Older code in the same file is not a defense — legacy comments predate the feedback. Sweep test: if deleting the comment loses nothing the code, test name, or companion doc doesn't already say, delete it.

Reinforced 2026-07-27 on OR-2636 (PR #4215, "You're killin me... Too long. Always."): same three defects again — a 6-line test-class javadoc, per-test `// HLV-NNN: ...` comments that just restate the test title, and inline comments restating the assertion below them. And I **skipped the close-out comment sweep entirely** — committed/pushed straight through the green light without it. The sweep is not optional: run it as an explicit step before the commit in every green-light close-out. A comment that repeats the test title/ID or narrates the next assertion always gets deleted.

Related: [[terse-no-summaries]], [[feedback_green_light_closeout]]
