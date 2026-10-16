---
name: project-or2992-in-case-overlay
description: "OR-2992 unified in-case overlay (IMPLEMENT, chain with OR-2999 restyle) — spec approved 2026-10-15, built + manually validated on Vite 3008, DONE 2026-10-15: PR #4701 merged into the epic (2ef841b37), worktree gone; two PRs (structure first), OR-2999 on a fresh branch after merge"
metadata:
  node_type: memory
  type: project
  originSessionId: ccfd5bfd-f2e0-4f20-b2c2-62a448973551
  modified: 2026-10-15T14:57:03.608Z
---

OR-2992 (Story under OR-2863, assigned Ryan) + OR-2999 (Story, assigned Ryan 2026-10-15) run as one
workon chain: worktree `~/dev/worktrees/OR-2992-in-case-overlay`, branch `feature/OR-2992-in-case-overlay`
(fast-forwarded onto the epic; `git reset --hard` is classifier-blocked, `git merge --ff-only origin/epic/…`
is the lossless equivalent while the branch has no commits). Vite 3008 (PID in the session scratchpad),
proxied to Ryan's 8080. **Ryan chose two PRs, structure first (2026-10-15):** 2992's draft PR into the epic
after the LAUNCH run + VIS-030/031 CI capture; OR-2999 restyles on a fresh branch off the epic once 2992
merges, graded against those baselines. No feature spec for 2999 (design-record diff only).

**Spec (approved by Ryan 2026-10-15, verbatim in OR-2992 acceptance criteria):** new
`spec/features/in-case-overlay.md` R1–R17 + `admin-shell.md` R29 (next free admin-shell R30). Decisions:
Ctrl+D only (Ctrl+Shift+A retired); the way in is an admin-only "Admin tools" button in the Settings
dialog footer ("clinicians never see anything other than launched cases"); every index entry embeds (HL7
Messages / Integration Harness already had un-exported Content halves); header = patient name + case ID;
Escape closes the overlay (nested dialogs all set `keyboard={false}` themselves, so Escape never closes
both); reopen always lands on Case/Patient Demographics; case-tab state survives a visit to an admin tool.
The baseline specs live only on the epic branch, so CHANGE diffs are made against
`origin/epic/OR-2863-design-foundation`, not main; Ryan is the approver.

**DONE 2026-10-15:** [PR #4701](https://github.com/guidedclinical/orci/pull/4701) merged into the epic (merge 2ef841b37, commits 3c012a772 + 380f2be51); `worktree-done` clean; OR-2992 moved to Done. Vite 3008 stopped. OR-2999 is next: `workon OR-2999 debugger-styling` (Vite 3009), design-record diff only, graded against VIS-030/031; the epic session still needs to pull + regate.

**Build:** `components/InCaseOverlay/{InCaseOverlay.tsx,adminPanels.ts,InCaseOverlay.scss}`;
`adminIndex` is now `as const satisfies readonly NavGroup[]` exporting `AdminHref`, and
`adminPanels: Record<AdminHref, ComponentType>` makes a panel-less index entry a typecheck failure (this is
how OR-2991's consolidation flows through: one registry line). `AppLaunch` owns the state + `useHotkeys`
(`enabled: isAdmin, preventDefault`) and threads `onOpenAdminTools` through `Home` → `SettingsModal`.
Modal is `fullscreen scrollable`; body is `display:flex` so the sidebar and content scroll independently
(Bootstrap's `flex: 1 1 auto` body gives children no definite height otherwise). Old `InAppAdminPanel` +
`InAppDebugger` deleted. Gates: typecheck, color literals 86/20 unchanged, cascade 0/0/+4 (own selectors).

**Tests:** LAUNCH-005 @core, LAUNCH-006/007 @supplemental (`smoke/app-launch.spec.ts`, titles carry
`[in-case-overlay R…]`); LAUNCH-006 diffs the overlay sidebar against Home's `.index-panel`s live.
VIS-030 (case tabs, `.in-case-overlay__case .tab-content` + `.modal-title` masked) and VIS-031 (Feature
Flags via `stubFeatureFlagList`) need the CI capture; next free VIS-032. `debugger.page.ts` now targets
`in-case-overlay` and scopes tabs to `.in-case-overlay__case` (no spec imports it). Local e2e recipe:
`BASE_URL=http://localhost:3008 npm run test:local -- --grep "LAUNCH-00[567]" --project=smoke-launch
--no-deps` from the worktree qa-suite — needs the env file copied from `~/dev/orci/qa-suite` (hook blocks
me from touching `.env*`; Ryan copies it).

**Gotchas this session:** background Bash ignores a leading `cd` — use `npm --prefix <dir>` and absolute
binaries (`node_modules/.bin/vite <root>`); zsh needs quoted `--include='*.tsx'`.

See [[project-or2863-design-foundation]], [[or2863-child-session-sop]], [[project-or3043-baseline-feature-specs]].
