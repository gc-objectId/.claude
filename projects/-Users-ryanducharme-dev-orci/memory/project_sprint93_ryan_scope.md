---
name: sprint93-ryan-scope
description: Sprint 93 planning (2026-09-25): OR-2941 cefazolin default-dose rule is Ryan's first implementation ticket via rule-spec; OR-2938 vanco EBL test with Alex; antibiotic rule consolidation will break PABX tests
metadata:
  type: project
---

Sprint 93 planning, 2026-09-25 (Alex, Theo, Jordan, Ryan).

- **OR-2941 `w-cefazolin-default-dose`** — assigned to Ryan. Theo: "generate the spec and go
  full out on an implementation." Overweight (>= 120 kg) + normal CrCl: first dose 3 g, every
  redose 2 g (today redose = first dose = 3 g). Theo's chosen shape: pull cefazolin out of
  the generic default-dose adjustment and give it its own rule, same pattern as
  `w-cefepime-default-dose-adjustment`. Use `/rule-spec` (guided-skills PR #9 branch
  `spec-output-contract` writes the catalog file; main version writes a ticket). Theo also
  mentioned a backlog cefazolin ticket with a similar "administer this way" shape.
- **OR-2938** — test vanco infusion + EBL > 1500 mL still fires the EBL redose reminder.
  Alex + Ryan in TST; Theo says code inspection is enough (rule looks at bolus or all admins).
- **OR-2933 / OR-2939** — MRSA: global "add vancomycin to first pathway step" replaces
  `w-mrsa-infection-status` (delete, not disable). Changes wrong/missing-antibiotic semantics.
- **OR-2944 / OR-2948 / OR-2946 / OR-2949** — Theo collapses known-procedure-no-antibiotic +
  missing-antibiotic into `a-incomplete-antibiotic-pathway` with state-based text (given /
  absent / early-redose / early-no-redose / early-discretion, 4 h window vs per-drug lookback).
  Theo flagged this will break Ryan's existing PABX-family tests. PR #4582 open.
- Alex wants a "test ticket for the spec process" too; Theo pointed at Ryan's baseline work.

**Why:** Theo wants Ryan on implementation, not only testing; OR-2941 is the deliberately
thin first ticket. **How to apply:** spec first (rule-spec), then implement; keep the
medication-selection baseline (feature-spec) running in parallel.
