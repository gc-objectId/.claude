---
name: feature-specs-program
description: Theo's feature-spec initiative (Sep 2026): baseline specs for existing behavior under spec/features/ with tests that name requirement ids; medication selection is the first target
metadata:
  type: project
---

Theo asked Ryan (meeting 2026-09-24) to pressure-test the spec tooling: write BASELINE
feature specs for existing behavior (medication selection first, then window management /
BSM minimize-maximize), fold qa-suite tests in so each test names the requirement id it
proves, then repeat, then use the flow for new rule-based tickets Theo hands over.

**Where things live**
- Templates + linter: orci PR #4579 (`docs/templates/spec-feature.md`, `jira-ticket.md`,
  feature rules in `spec_lint.py`). Unmerged as of 2026-09-25; `spec/features/` has no files.
- Skill: guided-skills PR #12 (`/feature-spec`, modes NEW / BASELINE / CHANGE). Checked out
  at `~/dev/guided-skills-feature-spec` (git worktree) and symlinked into
  `~/.claude/skills/feature-spec`. Remove the worktree + symlink once PR #12 merges.
- Related: guided-skills PR #9 points rule-spec/rule-summary at the catalog; orci #4504 is
  the in-repo review contract.

**Why:** existing behavior is undocumented, so every requirements conversation starts with
"what does it do today". Litmus test from Theo: could someone reimplement the feature from
the spec alone. Rules are NOT features; a feature is product-level behavior that rules
consume.

**How to apply:** run `/feature-spec` in BASELINE mode; skill step 1 reads templates from
`origin/main`, which fails until #4579 merges (read `origin/feature-spec-template` instead
and flag it). Baseline merges alone in a spec-only PR. Keep the evidence ledger (Tested /
Code only / Suspect) in the ticket comment and PR body. Existing scanner coverage:
`qa-suite/scanner/unknown-ndc-flow.spec.ts` (NDC-001..005) + `pages/barcode.page.ts`.
