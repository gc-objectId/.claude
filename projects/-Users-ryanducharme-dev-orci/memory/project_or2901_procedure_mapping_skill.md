---
name: or2901-procedure-mapping-skill
description: "OR-2901 procedure-type-automap skill validated deploy-ready and closed 2026-10-15; lives in guided-skills; PR #17 reworked after two review rounds, push pending Ryan; how to run and validate it locally"
metadata:
  type: project
---

OR-2901 (Skill for procedure mapping, epic OR-2895) is DONE as of 2026-10-15. The skill is
`procedure-type-automap` in guidedclinical/guided-skills (PR #16, merged 2026-09-29); orci PR #4600
was closed in favour of that move. The orci worktree `OR-2901-procedure-mapping-skill` never got a commit.

Automation PR: guided-skills #17 (draft, branch feature/OR-2901-output-validation, worktree
`~/dev/guided-skills-OR-2901`). Pushed commit 01d43a9 was the first validator; local commit b9e9025
(as of 2026-10-16, not pushed, waiting on Ryan) reworks it after two multi-agent review rounds:
exact per-file contract (header, exact code coverage, complete rows, Confidence 0-1, --method llm,
--verification mode accepting "A AND B" suggestions), merge_output strips values, SKILL.md runs
from the run dir via `$SKILL/bin/`, split script renamed `split_batches.py`, 82 tests, 39/39 mutants
killed. The OR-2901 Jira follow-up comment still says "12 pytest cases" and needs updating after push.

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
- Related: [[or2915-erx-mapping-skill]], [[jira-watch-autovalidate]], [[bash-heredoc-unicode-escapes]].
