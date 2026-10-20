---
name: or3074-launch-screens
description: "OR-3074 DONE 2026-10-19 (#4725 into the epic): launch interstitials declared as clinical movement, blocked screen alert role restored; follow-up OR-3089 under OR-3054"
metadata:
  node_type: memory
  type: project
  originSessionId: 026c2358-5d0b-4c55-ae35-8c24564b06f1
  modified: 2026-10-19T14:19:53.763Z
---

OR-3074 (Task, child of the design epic [[project-or2863-design-foundation]]) — **DONE 2026-10-19**: [PR #4725](https://github.com/guidedclinical/orci/pull/4725) merged into `epic/OR-2863-design-foundation` as 2f7f25832, worktree removed, ticket moved to Done. Still owed by the epic session (ticket's Record): add the launch screens to the epic's declared clinical movement in the epic→main PR.

What shipped: `Interstitial` takes an optional `role` (default still `alert` for the danger tone); `LaunchBlockedDisplay` passes `role="alert"`. front-door **R57** (blocked launch announced as an alert) + R40/R57 Decisions + group label "seen by every clinician launched from the EHR" + corrected EHR known gap; spec keeps `clinical: false` (Ryan's call: that flag means "a rule reads the output" and fences autofix, not "clinician sees it"). tokens.md OR-2990 declared delta names the launch screens (combined sentence agreed with the OR-3078 session). Tests: **LAUNCH-012** (real pediatric block — `createPediatricCase` fixture, 5 y / 15 kg, launch without `forceLaunch`; red-checked by dropping the role), **VIS-038/039/040** loading (launch POST held by `page.route`), blocked (real), failed (stubbed 504 + fixed `x-trace-id`). Baselines named `launch-*`, CI run 39263820058, all 93 baselines byte-identical.

Id churn this ticket hit (epic children merged mid-flight): R55→**R57** (OR-3075 took R55/R56, OR-3078 R58/R59), LAUNCH-010→**012**, VIS-037–039→**038–040** (OR-3073 took 036, OR-3070 took 037). Re-check the epic tip's highest ids right before every push, not just at start.

VIS-040 captures "Show details" in Bootstrap's underlined blue — that's OR-3084's Interstitial.scss load-order item; VIS-040 will move when OR-3084 lands.

Follow-up **OR-3089** (Story under OR-3054, no link to the design epic): failure interstitials (R11/R43/R49/R50) are alerts with no requirement or test; product mark sits inside the announced region.

Ryan, 2026-10-16: any follow-up found in a design-epic child goes in as a child of OR-3054 with OR-3084's Working block, never linked to the design epic (also in [[or2863-child-session-sop]]).
