---
name: or2901-procedure-mapping-skill
description: "OR-2901 procedure-type-automap skill: DONE 2026-10-15, validator PR guided-skills #17 merged 2026-11-02, both worktrees gone; how to run and validate the skill locally"
metadata:
  node_type: memory
  type: project
  originSessionId: 861319e7-e94d-4388-9912-c939d9b286ed
  modified: 2026-11-02T15:54:45.811Z
---

OR-2901 (Skill for procedure mapping, epic OR-2895) is DONE as of 2026-10-15. The skill is
`procedure-type-automap` in guidedclinical/guided-skills (PR #16, merged 2026-09-29); orci PR #4600
was closed in favour of that move.

Automation PR guided-skills #17 merged 2026-11-02 (merge commit 1d3156d, Theo approved). It added
`bin/validate_output.py` (exact per-file contract: header, exact code coverage, complete rows,
Confidence 0-1, `--method llm`, `--verification` accepting "A AND B" suggestions), value stripping
in merge_output, the `split_batches.py` rename, a `$SKILL/bin/` run-from-the-run-directory SKILL.md,
and 82 pytest cases. Theo's one comment trimmed Step 1 to a named run directory, defaulting to
`procedure-type-automap-runs/<hospital-slug>/`. Both worktrees are removed; nothing is owed.

**Why:** validating this ticket means driving guided-skills against orci's committed MGB procedure
list, not an orci build; the jira-watch loop skip-listed it for that reason.

**How to apply:**
- venv: `python3.13 -m venv ~/.claude/cache/procedure-type-automap/venv` + `pip install scikit-learn==1.9.0
  numpy sentence-transformers torch pytest`. The pickles were built with sklearn 1.9.0; 1.9.1 warns but
  gave byte-identical MGB output. Apple's /usr/bin/python3 (3.9) is too old. HF_HUB_OFFLINE=1 after first run.
- Reproducible positive: adapt the MGB `procedure-codes.csv` ("Procedure Name", ground truth from
  Identifier) → 295 codes, 276 resolved, 19 to the LLM tier; 85.5% exact on 242 scorable codes, 70.2% raw.
- Real-data false-positive check for the validator: MGB tiers plus a colleague's 6,653-row verified run
  reshaped into mapping and verify-results formats (both pass).
- categories.csv drifts from the Mayo master-procedure-types.csv; run `bin/sync_categories.py` first.
- Out of scope, not filed: CSV formula injection via verifier Rationale into output-verified.csv.
- Related: [[or2915-erx-mapping-skill]], [[jira-watch-autovalidate]], [[bash-heredoc-unicode-escapes]],
  [[guided-skills-worktree-teardown]].
