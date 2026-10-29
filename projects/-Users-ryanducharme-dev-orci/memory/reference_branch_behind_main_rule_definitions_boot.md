---
name: branch-behind-main-rule-definitions-boot
description: A worktree build based on an older main fails to boot against the shared local DB when main added a RuleCategory value, because rule_definitions rows carry it; rebase before launching on 8081
metadata:
  type: reference
---

Booting a branch build on 8081 against the shared local Postgres died in `ApplicationRunner` with
`Cannot deserialize value of type RuleCategory from String "COMPLIANCE_ANTIBIOTIC_PROPHYLAXIS"`.
Ryan's 8080 main build had already upserted that category into every tenant's `rule_definitions`
(see [[rule-definitions-rebuilt-on-boot]]), and the branch, cut from an older main, lacked the enum value.

Fix is not DB surgery: `git fetch && git rebase origin/main`, rebuild, relaunch. Check
`git merge-base --is-ancestor <main-head> HEAD` before the first launch on a branch more than a day old.

Also from the same session: `psql -Atc "insert ... returning id"` prints the id line *and* the
`INSERT 0 1` command tag, so pick the uuid-shaped line rather than the last line.

Related: [[run-worktree-app-second-port]], [[reference_demo_tenant_applaunch_validation]].
