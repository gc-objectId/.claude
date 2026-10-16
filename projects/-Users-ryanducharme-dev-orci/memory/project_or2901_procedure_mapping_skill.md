---
name: or2901-procedure-mapping-skill
description: "OR-2901 procedure-type-automap skill validated deploy-ready and closed 2026-10-15; lives in guided-skills; how to run the pipeline locally, what the validation found, and the open follow-ups"
metadata:
  node_type: memory
  type: project
  originSessionId: 861319e7-e94d-4388-9912-c939d9b286ed
  modified: 2026-10-15T20:22:18.555Z
---

OR-2901 (Skill for procedure mapping, epic OR-2895) is DONE as of 2026-10-15. The skill is
`procedure-type-automap` in guidedclinical/guided-skills (PR #16, merged 2026-09-29); orci PR #4600
was closed in favour of that move. Validation PR: guided-skills #17 (draft, feature/OR-2901-output-validation,
worktree `~/dev/guided-skills-OR-2901`) adds `bin/validate_output.py`, fixes the output-path bug, and
12 pytest cases. The orci worktree `OR-2901-procedure-mapping-skill` never got a commit.

**Why:** validating this ticket means driving guided-skills main against orci's committed MGB
procedure list, not an orci build; the jira-watch loop skip-listed it for that reason.

**How to apply:**
- venv: `python3.13 -m venv ~/.claude/cache/procedure-type-automap/venv` + `pip install scikit-learn numpy
  sentence-transformers torch pytest`. Apple's /usr/bin/python3 (3.9) is too old. First run pulls two HF
  models (~530MB), then the 295-code run takes ~20s.
- Reproducible positive: `bin/adapt_input.py orci/.../org/mgb/procedures/procedure-codes.csv --text-column
  "Procedure Name" --identifier-column Identifier` → 295 codes; pipeline resolves 276, LLM tier judges 19;
  85.5% exact on the 242 scorable codes (53 MGB labels are outside our taxonomy), 70.2% raw. Matches readme.
- Red check that works: feed `merge_output.py` an LLM CSV with a made-up identifier or a missing code; it
  passes through silently, the validator (or an external membership check) is the only thing that goes red.
- `categories.csv` drifts from `orci/.../org/mayo/procedures/master-procedure-types.csv` (12 master ids
  missing, 9 stale incl. p-hysterescopy); run `bin/sync_categories.py <master> --apply` then
  `bin/sync_hierarchy.py` before a real run. Jordan's attached MGB run used 3 stale-id rows and 5 compound
  "A AND B" verifier suggestions.
- Ticket-description items not in the shipped output (Band column, alternatives with reasons, procedure ID /
  service carry-through) belong to Alex's follow-up tasks under the epic, all To Do.
- Related: [[or2915-erx-mapping-skill]], [[jira-watch-autovalidate]].
