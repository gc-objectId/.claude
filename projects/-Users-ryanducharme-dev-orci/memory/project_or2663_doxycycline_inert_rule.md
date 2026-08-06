---
name: project_or2663_doxycycline_inert_rule
description: "OR-2663 validation found a-preop-doxycycline-check could never fire; self-set lockout defeated AppLaunchRule's atomic claim"
metadata: 
  node_type: memory
  type: project
  originSessionId: 02938cbf-9332-4b85-a16b-b11f3f1b6e5b
  modified: 2026-08-05T21:03:29.989Z
---

OR-2663 (`a-preop-doxycycline-check`) shipped **inert** — it could never fire. The rule called
`ruleMemoryService.setRuleLockoutForDurationOfOperation(...)` inside `evaluate()` right before returning
needs-action. `AppLaunchRule.apply()` then claims the same marker with `trySetRuleLockoutForDurationOfOperation`
(Redis `SET NX`), which fails because the key already exists, so the base class converts every firing into
`abstain("Rule already fired for this case.")`. Fix was deleting the rule's two self-lock statements.

**Why:** OR-2618 (`c7f7c997e`, 2026-07-23) centralized the once-per-case lockout in `AppLaunchRule` and stripped
the per-rule version from all five rules that had it. This rule was authored 2026-07-22 and merged 2026-07-27 —
written pre-OR-2618, merged post. Different files, so git merged clean and CI saw nothing. Same shape as
[[reference_stale_worktree_ci_merge_compile]] but semantic, so no compile error surfaced it.

**How to apply:**
- Every app-launch rule test in the repo calls `rule.evaluate(...)`, never `apply()` — so the base-class dedup
  path is untested per-rule. When reviewing or writing an app-launch rule, check `apply()` explicitly.
- A **mocked** `RuleMemoryService` cannot catch this: the rule's self-set is a no-op on a mock and can't affect
  what the stubbed `trySet...` returns. Needs a stateful stub modelling `SET NX` — added as
  `AppLaunchLockoutStub` in the applaunch test package, wired via `BaseAppLaunchRuleTest.useStatefulRuleLockouts()`.
- No app-launch rule should touch `ruleMemoryService` itself. Timer/event rules legitimately do (cooldown
  semantics, "Rule fired recently") — don't confuse the two.
- Validating through the app: a lockout key present with **no** alert and no `RuleFiredResult` is the signature.
  `GET /api/admin/rule/recently-fired/patient/{patientUuid}` shows it; abstain reasons come from
  `GET /api/admin/rule/evaluations/not-fired?caseId=...`.
