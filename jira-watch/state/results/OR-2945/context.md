# OR-2945 — Insulin default dose compliance always scores compliant

Status: Testing   Assignee: Ryan Ducharme

## Description

Current behavior: w-insulin-default-dose never scores non-compliant at any tenant. Since OR-1983 the rule writes its default dose to routeDefaultDoseOverride, but the insulin branch of DefaultDoseComplianceEvaluator still reads routeDoseOptionOverride. That field is always null on these firings, so the evaluator returns compliant. Mayo prod: 208 firings since go-live, 0 non-compliant.

Desired behavior: the insulin branch compares the administered dose against the rule's route default dose (routeDefaultDoseOverride) for the routes of interest, and scores a mismatch as non-compliant. Tests build firings in the shape the rule actually emits.

Follow-up: re-evaluate existing w-insulin-default-dose compliance results after deploy.

## Comments (0)

(none)
