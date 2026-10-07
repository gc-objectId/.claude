---
name: project-or2997-admin-platform-pages
description: "OR-2997 admin platform & ops pages on the design language — draft PR #4640 into the epic opened 2026-10-06 (awaiting Ryan's merge); decisions, VIS-019–027 via platform-stub.ts, overflow + AsyncButton + refetch-key lessons"
metadata:
  node_type: memory
  type: project
  originSessionId: bc0e474e-5f39-4342-866c-4cad604e3abb
  modified: 2026-10-06T14:10:12.289Z
---

OR-2997 (Story under OR-2863, Ryan). Worktree `~/dev/worktrees/OR-2997-admin-platform-pages`, branch
`feature/OR-2997-admin-platform-pages`, Vite **3005** proxied to Ryan's 8080 (per [[or2863-child-session-sop]]).
`workon` built it from main; reset onto the epic tip (473615ea1) before the first commit. Session started 2026-10-05.

**Decisions (Ryan, 2026-10-05):** restyle the shared `JobQueueDisplay` in place (the debugger's Job Queue tab follows,
declared not graded — VIS-012 masks `.tab-content`); collapse the `*Content`/page twins in FeatureFlags, ReleaseNotes,
Feedback into one body component with the selection handler injected; HL7 in the same PR as its own commit; fix the lost
`?client_id=` on the release-note and feedback detail routes (the page variants now also get `TenantScope`, writing
`client_id` to the search params like Feedback already did).

**Visual cases:** VIS-019 release notes (+ editor dialog by route), VIS-020 feedback (+ open submission by route),
VIS-021 API tokens, VIS-022 job queue, VIS-023 reporting (date inputs masked — default to today), VIS-024 event center
(`.event-center__timestamp-toggle` hidden via VOLATILE_TEXT_CSS), VIS-025 HL7 inbound (+ detail; `#hl7-from` masked in
BOTH shots — it ticks with the clock and shows through the modal backdrop), VIS-026 HL7 send with the flowsheet template
(timestamp/control-id inputs masked by label), VIS-027 feature flag editor (`stubFeatureFlagEditor` in
feature-flag-stub.ts). All served from `qa-suite/visual/platform-stub.ts`. Next free VIS id: **028**.

**Shared additions (AdminPage.scss):** `.admin-field(--wide)`, `.admin-filters(__actions spans the row)`,
`.admin-detail(__body)`, `.admin-code`, `.admin-pre`, `.admin-preview`, `.admin-icon-button`, `.admin-busy`,
`.admin-accordion`, `.admin-link-button`, `.api-token`. `AdminTable` thead th now `position: relative`.

**Lesson — hidden header widens the page:** `<th><span class="visually-hidden">` is `position:absolute`; inside a
responsive table wider than its wrapper, with no positioned ancestor inside the scroll container, its static position
lands past the viewport and `documentElement.scrollWidth` grows (body.scrollWidth stays) → full-page snapshots come out
1443px wide at 1280. Fix: position the `th`. Probe recipe: throwaway spec listing elements with `rect.right > clientWidth`.

**Hook gotcha:** the Bash secrets hook blocks any command text containing `.env` — including `process.env` in a heredoc.
Write such files with the Write tool, then run them from Bash.

**State 2026-10-06:** [draft PR #4640](https://github.com/guidedclinical/orci/pull/4640) → epic branch, 7 commits
(capture b0a082f8f → restyle da5abc1f3 → HL7 7ba7b98a1 → baseline 17c256d03 → fixes 0ae593db0 → rebaseline 036a6a342).
Jira comment posted; ticket stays In Progress until Ryan merges, then `worktree-done` + Done. Before-capture run
37475093449 (first dispatch 37371228944 died to the GitHub "job not acquired" outage), rebaseline run 37476974964;
unchanged screens byte-identical. Flagged copy changes: "Published"/"Publish failed", "Add note", "Download CSV"/
"Download report", release-note text truncation 30→80.

**Function-check lessons (throwaway spec against Vite 3005 + Ryan's 8080, admin login proxied):** `AsyncButton`
called `onClick()` without the event → `e.stopPropagation()` threw, spinner stuck, click bubbled to the row (fixed:
event passed through). List refetch keys were `String(new Date())` — second resolution, so automation's back-to-back
writes never refetched (fixed: counter). Local quartz jobs endpoint 500s for an unknown case id; the smoke case works.
Event send with no patient/case → backend 500 → toast error path (expected). Pre-existing, left alone: ReleaseNoteEditor
`initialValues={data!}` before load → "controlled to uncontrolled" warning; Reporting `TenantPickerFormikField` with
null initial value → "value prop should not be null" warning. Sibling-session Bash calls share one cwd — a parallel `cd`
clobbers the other; always use absolute paths.

See [[project-or2863-design-foundation]], [[project-or2995-admin-patients-cases]],
[[project-or2996-clinical-reference-data-pages]].
