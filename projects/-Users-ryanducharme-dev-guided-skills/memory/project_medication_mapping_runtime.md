---
name: medication-mapping-runtime
description: "How to run and validate the medication-mapping pipeline (ndc-mapping / erx-mapping skills) locally — Python 3.10+ requirement, dataset setup, RxNav timing, worktree creation for guided-skills"
metadata:
  node_type: memory
  type: project
  originSessionId: 3aeb6e58-f9a2-4109-9948-5de97e0eb75f
  modified: 2026-10-02T16:34:46.524Z
---

Running `medication-mapping/` (OR-2914 ndc-mapping, OR-2915 erx-mapping) on Ryan's Mac, as of 2026-10-02:

- The modules use PEP 604 `str | None` annotations at def time, so they need **Python 3.10+**. The macOS system `python3` is 3.9.6 and fails at import; `python3.13` (Homebrew) works. Neither has pytest. Make a venv in the session scratchpad (`python3.13 -m venv $S/venv && pip install pytest`) and put `$S/venv/bin` first on PATH so `run.sh`'s bare `python3` resolves to it.
- `./setup.sh` downloads ~80 MB (RxNorm prescribable zip + FDA product.txt/package.txt) into the pipeline dir; all gitignored.
- A first run on a client file pays one RxNav call per NDC the RxNorm release lacks. Observed throughput was ~1.7 lookups/s, not the nominal 8/s: MGB's full 41k-row list (21k distinct NDCs) did not finish in 1 hour. The 178-row September file took ~3 min. The cache (`rxnav.sqlite`) survives interruption; `roundtrip.py` takes `--rxnav-cache` so a copy lets it run concurrently.
- `worktree-create.sh` / `workon` are orci-only (they die on the missing `qa-suite/.env.local`). For guided-skills, create the worktree by hand: `git worktree add -b feature/OR-NNNN-slug ~/dev/worktrees/OR-NNNN-slug origin/main`.
- Real test data for NDC onboarding: the OR-2914 attachment "new and soft deleted NDCs from 9.9 FDB load.xlsx" (MGB's September additions, sheet "New NDCs": ID, NDC, Raw 11-Digit NDC, Associated Medication, Deleted?). Convert to the five importer columns and run with `--medication-list` pointing at MGB's list.

**Why:** the README assumes a working `python3` and never states the version; an hour was lost to the full-MGB run before realising RxNav throughput was the bottleneck.

**How to apply:** start every pipeline session by building the 3.13 venv and running the unit suite (471 pass as of PR #15), then validate on the small real file before any full-tenant run.
