---
name: reference_egfr_adjustment_type1_only
description: "AdjustInsulinInfusionRateRule's renal (eGFR < 45) adjustment is only reachable for Type 1 patients, because the lowered ISC trips the 0.5 units/hr floor abstain"
metadata:
  node_type: memory
  type: reference
  originSessionId: bdd6914d-3e5c-4c83-ac8f-f2b363236a80
  modified: 2026-08-31T00:00:00.000Z
---

In `AdjustInsulinInfusionRateRule`, a **numeric eGFR below 45 lowers the ISC enough that the recommended rate lands under the 0.5 units/hr floor** — and the rule then abstains with `"Recommended rate is < 0.5 but patient doesn't have diabetes type I"` for any patient lacking `ConditionTag.DIABETES_TYPE_1`. Type 1 patients survive because the low-rate branch clamps to 0.5 instead of abstaining.

Consequence: **the renal clause in "Show Calculation" is effectively Type-1-only in practice.** The 2×2 of `hasDiabetesType1` × `eGFRAdjusted` looks independent when you read `generateExpandedCalculation`, but at runtime the eGFR-only quadrant is mostly unreachable — the rule gives up before rendering it. Don't stage a non-Type-1 patient with a low eGFR and expect an alert; it silently abstains.

Found staging INS-008: identical fixtures differing only in eGFR produced a *firing* alert for the unreadable `">90"` and *no alert at all* for `"30"`. The abstain reason is only visible in `rule_not_fired_results.explanation` (column is `explanation`, not `reason`) — the fired-results table shows nothing, so a missing alert looks like a broken test rather than a deliberate abstain. Query it:

```sql
select explanation, count(*) from "demo-qa".rule_not_fired_results
where rule_identifier='a-adjust-insulin-infusion-rate'
  and created_date > now() - interval '2 hours' group by explanation;
```

Two other staging constraints for this rule: it needs **two** glucose readings (it abstains until a previous ISC exists to compare against), and the recommended rate must differ from the active infusion rate by more than 0.1 units/hr.

This is the rule working as coded, not a defect — but it is worth raising if the renal adjustment is ever meant to apply to Type 2 patients.

Related: [[reference_insulin_dose_isc_validation_surface]] (the ISC strategy split and initial-coefficient branch), [[reference_qa_suite_rule_details_api]], [[project_dosing_alert_semantics]].
