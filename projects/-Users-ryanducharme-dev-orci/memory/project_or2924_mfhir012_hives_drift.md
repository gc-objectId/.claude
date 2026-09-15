---
name: or2924-mfhir012-hives-drift
description: "OR-2924 MFHIR-012 red since 2026-08-27 from Epic TST reaction text drift; draft PR #4561 loosens the match; severity deliberately unasserted"
metadata: 
  node_type: memory
  type: project
  originSessionId: decbb038-7ca4-4e5d-b40c-5910c3b952df
  modified: 2026-09-14T19:48:12.612Z
---

MFHIR-012 (qa-suite Mayo FHIR commands) was the sole post-deploy failure from 2026-08-27 on: Epic TST returns Wilfredo's gentamicin reaction as `HIVES (RAISED, ITCHY, SKIN WELTS)`, the test matched exact `HIVES`. Fix in draft PR #4561 (branch `feature/OR-2924-mfhir-012-hives-drift`, worktree `~/dev/worktrees/OR-2924-mfhir-012-hives-drift`): `toContainEqual(expect.stringContaining("HIVES"))`. DONE 2026-09-14: PR #4561 merged (b9b1ded), worktree removed, ticket closed. No dev run was executed before merge (worktree lacked the dev env file, Dashlane CLI unauthorized); the first post-deploy qa-suite run after b9b1ded is the proof. If MFHIR-012 is still red there, Epic TST's text changed again.

**Why:** on main the reaction resolver is an exact `findByReaction` lookup and the CSV seeds `HIVES` and `HIVES (RESELECT REACTION)` only; Theo deliberately did not seed the dev-only `(RAISED, ITCHY, SKIN WELTS)` text ([[or2862-allergy-reaction-paren-drift]]). So on dev this allergy resolves to `OTHER_UNKNOWN`; the richer assertion from closed PR #4506 (severity MODERATE + highestSeverityAllergyReaction HIVES) would stay red.

**How to apply:** check the next post-deploy qa-suite run for MFHIR-012 before assuming the suite is healthy. Don't re-add the severity assertion unless the resolver strips qualifiers or the text is seeded.
