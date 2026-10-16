---
name: or2915-erx-mapping-skill
description: "OR-2915 ERX mapping skill validated deploy-ready and closed 2026-10-15; lives in guided-skills, not orci; how to run its pipeline and tests locally"
metadata:
  node_type: memory
  type: project
  originSessionId: 36d78824-d9c4-4e1e-bc55-c0ffa8ef2b5f
  modified: 2026-10-15T20:17:20.181Z
---

OR-2915 (erx-mapping skill + `erx.sh` pipeline in `medication-mapping/`) is DONE as of 2026-10-15.
It merged in guidedclinical/guided-skills PR #15 on 2026-09-29; the orci PR #4584 was closed in
favour of that move. The jira-watch loop skip-listed it as `merged_elsewhere`. Sibling OR-2914
(ndc-mapping) closed the same way on 2026-10-02. Parent epic OR-2896 still has OR-2908–OR-2913 To Do.

**Why:** validating these tickets means driving guided-skills `main` against orci's committed
tenant files (`orci/src/main/resources/data/org/<tenant>/medications/`), not an orci build.

**How to apply:**
- Run from `~/dev/guided-skills/medication-mapping` with `export ORCI_REPO=<orci checkout>` and
  `PATH=/opt/homebrew/bin:$PATH` first: `erx.sh` calls bare `python3`, and Apple's 3.9 at
  `/usr/bin/python3` fails on `str | None`. No Homebrew python has pytest; make a scratch venv
  (`python3.13 -m venv`, `pip install pytest`) and run `python -m pytest -q` (471 pass, 6 FDA-gated skips).
- Mayo (1,387 rows) is the curated reference: 98.65% auto-assign precision name-only, 99.35% with
  the NDC link, floor 98%. MGB is the full 108,982-row Epic master; its committed file names 166
  identifiers neither list defines (m-promethazine-iv, m-ephedrine, SGLT2 generics), emptied + reported.
- Red checks that work: drop `and change_confirmed` in `erx_finalise.decide` (5/24 finalise tests
  red, 12 unmarked Mayo mappings move); raise `PRECISION_FLOOR` to 0.999 (both floor tests red).
- `~/.claude/skills/erx-mapping` is NOT linked until `bash ~/dev/guided-skills/setup.sh` is re-run.
- Related: [[ndc-mapping]], [[feature-specs-program]].
