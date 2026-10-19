---
name: project-or3070-case-screen-states
description: "OR-3070 pin case-screen control states — prep done 2026-10-16 (main's computed values recorded, VIS-036 written); pins wait for OR-3003 to merge; probe technique + lined-up pin list"
metadata:
  node_type: memory
  type: project
  originSessionId: d1bb72f9-01e2-4f33-b51d-cb0fc0c2eb86
  modified: 2026-10-19T13:34:31.578Z
---

OR-3070 (Bug, epic child, port 3025, branch bugfix/OR-3070-pin-case-screen-states).
**Order flipped 2026-10-16:** OR-3003 (Bootstrap 5.3.8) merged first (#4715); branch rebased onto f495b9ba6 and pinned.
**State 2026-10-16 16:35:** commits 3a5034c0f (VIS-037) + 19c4f6924 (pins + two approved `:where` comments) pushed;
capture run 38932684639 dispatched; no PR yet (opens after the VIS-037 linux PNGs are committed). Jira description
corrected (dosing options incl. dose/concentration; pressed-text claim dropped); measured values go in the close-out
comment. **VIS-036 belongs to OR-3073** (dev banner case screen, uncommitted then) — this ticket's case is VIS-037;
whichever merges second keeps numeric order.
**Capture run 1 (38932684639):** all 84 committed VIS-001–035 PNGs byte-identical with the pins; VIS-037 timed out because
VIS-005 saves CeFAZolin on the spec's shared patient → later CeFAZolin tab opens on "Too Early: Redose". Ryan chose to
isolate the writer: e379f7043 gives VIS-005 its own `savedDosePatient` (same config/conditions/allergy). Capture run 2 =
38934802753. Local qa runs collide with other sessions' runs on the same 8080 (their globalSetup resets demo-qa and
sweeps `qa-suite` tokens → 401s mid-run): check `ps … playwright test` first. Filed as **OR-3086** (Bug, child of OR-3054,
no links; added to OR-3054 Outcome + Sequence step 1). OR-3073's session filed OR-3088 30s later for the same thing →
2026-10-19 (Ryan): its details + proof recipe folded into OR-3086, Duplicate link, OR-3088 Done.
**Capture run 2 (38934802753) green:** 84/84 byte-identical (VIS-005 on its own patient too), VIS-037 rendered and matched
main by eye. Rebased onto 7b8514faf (OR-3073 VIS-036 + OR-3078 tokens merged): conflicts only in the visual spec/md
(kept VIS-036 then VIS-037; `forPatient` + `showDevBanner` both in clinicalSession) and tokens.md (epic tables + skeleton
row/tokens + both history entries); cascade vs epic unchanged. 2026-10-19: VIS-037 PNGs committed (0e35e12a5), probe
removed (backup in scratchpad), Vite 3025 stopped, force-pushed, **draft PR #4722** into the epic, close-out comment
posted (In Progress until merge). PR gate run 39260782266 re-renders VIS-037 against the committed PNGs.
**2026-10-19 13:33: #4722 MERGED into the epic (1934c1486) before its gate finished; worktree-done exit 0 (worktree +
branch gone).** Gate 39260782266 on the merged tree GREEN (QA 142, visual 37/37) → **OR-3070 DONE 2026-10-19.** Next free VIS-038.
`lsof -p PID -iTCP` ORs its filters — use `lsof -a -p PID -iTCP` to check a PID's own port.

**Probe (the measuring tool):** untracked `qa-suite/visual/state-probe.spec.ts` (never commit; backup in session scratchpad).
Playwright + CDP `CSS.forcePseudoState` (hover/active/focus/focus-visible are deterministic that way; real input isn't),
`apiLogin(context.request, BASE_URL)` because `uiLogin` expects the epic home page and fails on main's frontend; cookies are
port-agnostic so one login serves 3000/3001/3011. Run: `PROBE_ORIGINS=main=http://localhost:3000,epic=http://localhost:3001
PROBE_OUT=<dir> npm run visual:local -- state-probe.spec.ts --no-deps`; diff with a small node script. CeFAZolin preselects
a dose for 70 kg → type "0" then Save to get `is-invalid`. CeFAZolin has two routes (Intraosseous = natural unselected option).

**Measured main → epic (2026-10-16):** dose field invalid padding-right 38.4px→12px (rest too), focus border #dc3545→#1a1a1a,
glow red .25→dark .5; unselected outline-secondary options (dose, concentration, route, indication — ticket only named
route/indication) hover border #6c757d→black, keyboard focus text white→black on grey; `.AppLaunch .btn-close` focus opacity
1→.75; open Reject toggle keyboard ring rgba(164,159,150,.5)→none; Reject pressed bg off by 1 unit; portaled clinical
primary/outline-primary focus ring teal/blue .5→maroon .12; skeleton #e0e0e0/#f5f5f5→#d9d9d9/#f7f7f7. **Not real:** "white
text while pressed" on options (outline-secondary active color is already white). Alert list items + inactive tabs: no diff;
active tab black = OR-2990's declared delta (6). OR-3003's 3011 workbench matched the epic on every state (only the close
SVG data-URL string differs) → flips survive 5.3.

**Pins as built:** validation = `@each $state, $data in $form-validation-states` emitting only `.form-control.is-#{$state}`
padding-right `$input-height-inner` + `:focus` border/box-shadow from `map.get($data, …)` (the full
`form-validation-state` mixin nested in `.AppLaunch` emits ~8 never-matching `&`-compounded selectors); options = set `--bs-btn-color`/`--bs-btn-border-color` instead of `color`/`border-color`, drop the
`:hover` color; close = `--bs-btn-close-opacity`/`--bs-btn-close-hover-opacity` (5.3.8 drives opacity via vars, 5.2.3 didn't);
open-toggle ring = `.btn:focus:where(:not(.show, .active))`; Reject press = `.reject-reasons .btn:hover:where(:not(:active))`;
portaled ring = restate Bootstrap's `0 0 0 $btn-focus-width rgba(var(--bs-btn-focus-shadow-rgb), .5)` in both `.clinical-shell`
rules; skeleton = two tokens equal to the old shades (needs dark values now that 3003 adds modes). Color guard counts hex only.

**VIS-036** "Dosing form — invalid dose focused for correction" written (spec + companion, next free VIS-037); locally stable
across two renders; baseline comes from CI only after the pins, checked by eye against main's red-border render.
Local qa runs against the epic frontend: `BASE_URL=http://localhost:3001 npm run visual:local -- --grep VIS-036 --no-deps`
(the local backend sometimes stalls loading the dosing form — rerun). Delete local `*-darwin.png` afterwards.

Auto-mode classifier denied ~half the read-only Bash calls after the `git reset --hard` in this session ("Irreversible Local
Destruction"); Read tool and simpler single commands got through. See [[or2863-child-session-sop]], [[project-or2863-design-foundation]].
