---
name: project_or3132_premerge_review_validation
description: "OR-3132 (Theo's PR #4813, 5% default-dose tolerance) reviewed and validated pre-merge; tests PR #4823 stacked on his branch; worktree still up"
metadata:
  node_type: memory
  type: project
  originSessionId: f0db63ab-c013-44d6-ac8e-5774b4647ac2
  modified: 2026-11-05T15:08:30.791Z
---

**Status 2026-11-05:** PR #4813 (Theo, branch `OR-3132`) reviewed and validated deploy-ready pre-merge. Ryan approves on
GitHub himself. Tests PR #4823 is a draft stacked on `OR-3132` (base = Theo's branch, not main) from branch
`feature/OR-3132-compliance-tests` in worktree `~/dev/worktrees/OR-3132-default-dose-tolerance`. The ticket stays
In Progress; it is Theo's IMPLEMENT ticket and Done comes when #4813 merges.

**Owed after merge:** `worktree-done` from inside the worktree. If #4823 merges into `OR-3132` first, the rebase-merge
reads as unmerged locally (see [[reference_worktree_done_false_success]]).

**New workflow this piloted:** review a colleague's PR, then validate it like `/workon` VALIDATE mode against the
branch build before merge, with main as the pre-fix control, and land tests as a stacked PR into the author's
branch so the fix merges with coverage. The worktree is created by hand (`git worktree add -b feature/<key>-tests
<dir> origin/<pr-branch>`), since `worktree-create.sh` hardcodes `origin/main`. Ryan is deciding whether PRs
rather than Ready-for-Testing tickets become the main source of validation work.

**Findings worth keeping:** main's real path always needed an exact match (rounding factor was `@JsonIgnore`, and
compliance re-reads the firing from the DB), so the ticket's "one step either side at fire time" never applied in
production. Only pediatric per-kg route default in any site config is fentanyl 1 mcg/kg at MGB and demo.

**Local run:** the 8082 branch backend was launched by classpath (PID in the worktree's `app.pid`); kill that PID,
never by port. A flip-and-revert `mvn test` in the same worktree restarted it onto broken classes once; run
flips in a throwaway worktree instead.

Related: [[reference_default_dose_compliance_api_validation]], [[reference_run_worktree_app_second_port]].
