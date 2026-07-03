---
name: dosing-alert-accept-reject-semantics
description: Accept on a dosing alert does NOT save the admin; Reject overrides and saves. Alert button text is per-rule (rejectText); Playwright isVisible() never waits.
metadata: 
  node_type: memory
  type: project
  originSessionId: e2c0bc29-0b04-4cb6-a2ea-dbbe52602ca1
---

Learned fixing OR-2624 (LAMD-001 CI failure, PR #4058):

- **Dosing-alert semantics in DosingForm.tsx:** Accept (`acceptDosingAlert`) means "I'll reduce the dose" — it clears the alert and returns to the form **without saving** the administration. Reject (`rejectDosingAlert`) is the override path: it submits `accepted: false` and, when the last alert is rejected, calls `onDosingSave` — recording the admin and closing the tab. A test that needs an over-max admin *recorded* (e.g. to trigger a scan-time rule) must Reject, not Accept.
- **Alert button text is per-rule, not fixed:** accept/reject button labels come from each rule's `acceptText`/`rejectText` in its `EvaluationResultPromptTemplate`. Every rule currently uses `rejectText("Reject")` — "Reject Suggestion" exists only in Storybook mock data. qa-suite alert helpers target the rule-scoped `#{ruleId}-reject-button` id instead of button text for this reason.
- **Playwright `locator.isVisible()` never waits** — the `timeout` option is ignored; it returns the instant state. Conditional flows must wait for the container first (e.g. `expect(a.or(b).first()).toBeVisible()`), then do the instant check. Shared helper: `enterAnyDose()` in qa-suite/pages/dosing-form.page.ts.
- Rules with no preset `rejectReasons` only offer the free-text "Other" input in the reject dropdown — use `Alert.rejectWithCustomReason()`.
