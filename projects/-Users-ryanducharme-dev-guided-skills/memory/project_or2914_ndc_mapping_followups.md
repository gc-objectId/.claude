---
name: or2914-ndc-mapping-followups
description: "OR-2914 (ndc-mapping skill) is Done but has open follow-ups: Theo's demo recording (on hold), worktree kept for it, undrafted follow-up ticket, unsent note to Alex"
metadata:
  type: project
---

OR-2914 "Skill for NDC mapping" (Task under epic OR-2896) was validated deploy-ready and moved to Done on 2026-10-02 (Jira comment 37634). As of 2026-10-22 these remain open:

- **Demo recording** — Theo asked in Slack for a recorded demo of using `/ndc-mapping` end to end. Ryan is holding off on it. The demo script lived only in the session scratchpad and has been cleaned; regenerate it into the repo (e.g. `ndc-mapping/DEMO.md`) when he picks it up. Flow: setup → shape the client file (Sept MGB xlsx → five importer columns) → `OUT=out-sept ./run.sh --medication-list <mgb list> sept-new-ndcs.csv` → skill judging + `mark.py` suggest → `finalise.py` shows 0 mapped → promote → 14 mapped → guardrails (refuses marked rows, refuses bogus identifiers even with `--force`, concentration disagreements left blank).
- **Keep the worktree** `~/dev/worktrees/OR-2914-ndc-mapping` (branch `feature/OR-2914-ndc-mapping`, no tracked changes). It is deliberately retained for the demo: it holds the ~188 MB gitignored datasets (RxNorm zip, FDA product/package.txt, warm `rxnav.sqlite`), so the Sept run takes ~3 min instead of a cold RxNav crawl. Do not tear it down until the demo is recorded or Ryan says so.
- **Follow-up ticket, not created** — Task under OR-2896: "medication-mapping: retry connection resets, surface NDCs with no FDA product, document the Python requirement". Acceptance: `rxnav._fetch` catches `OSError` so a reset is retried and not cached; an NDC with no FDA facts appears in exactly one output file with a reason (13/178 Sept, 1013/3550 MGB currently vanish); `run.sh` on Python 3.9 exits with a clear message.
- **Note to Alex, not sent** — 70 committed MGB `master-ndc-list.csv` rows name identifiers not defined in MGB's medication list.

**Why:** the ticket being Done makes it look finished; the worktree would otherwise look stale and get swept.

**How to apply:** on return, confirm the worktree still exists before offering the demo; see [[medication-mapping-runtime]] for how to run it.
