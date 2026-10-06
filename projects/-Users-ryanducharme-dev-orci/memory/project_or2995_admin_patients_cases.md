---
name: project-or2995-admin-patients-cases
description: "OR-2995 admin patients & cases pages — DONE 2026-10-05: PR #4635 merged into the epic (f98181df6), worktree removed; shared AdminPageHeader/AdminTable/FactList/SectionHeader for OR-2996/2997 to reuse; declared visual delta, VIS-012, lessons"
metadata:
  node_type: memory
  type: project
  originSessionId: 654ce017-b023-4f71-af5e-4939b0ef929e
  modified: 2026-10-05T14:07:39.827Z
---

OR-2995 (Story under OR-2863, assigned Ryan). Worktree `~/dev/worktrees/OR-2995-admin-patients-and-cases`,
branch `feature/OR-2995-admin-patients-and-cases` — `workon` built it from main; reset onto
`origin/epic/OR-2863-design-foundation` (0fe8e781a) before the first commit per [[or2863-child-session-sop]].
Session started 2026-10-05. Dev loop: own backend on 8081 (`./mvnw -pl orci spring-boot:run`, JAVA_HOME = brew
openjdk 25, `-Duser.timezone=UTC -Dtenants.demo.qa.enabled=true`; Ryan's 8080 was down) + Vite 3003 with
`VITE_PROXY_HOST_URL=http://localhost:8081`. Spring Session lives in Valkey, so Ryan's existing login cookie
worked on 8081 without a password.

**DONE 2026-10-05:** [PR #4635](https://github.com/guidedclinical/orci/pull/4635) merged into the epic (merge commit
f98181df6), ticket moved to Done, `worktree-done` clean. Gate 37322548658 green (QA 115, visual 12). The epic session
should pull, restart 3001 and regate the epic branch. Next children (OR-2996/2997) rebase onto the new epic tip.

**Commits:** 34cceb66c adds VIS-012 (operation host page, reached from the detail page's "View Operation"
link; masks `.admin-page__meta` + `.tab-content`) — pushed and captured by gate dispatch 37320555457 *before*
the restyle, per the SOP. 833cbc8db is the restyle.

**Shared surfaces added (reuse in OR-2996/2997):** `AdminPageHeader` in `components/AdminPage.tsx`
(breadcrumb `trail`, h1 title, `meta`, `actions`; eyebrow-styled trail via `--bs-breadcrumb-divider`),
`components/SectionHeader.tsx` (+ `.guided-section-header/-title` in `surfaces.scss`, which replaced Home's
`home-section-*` — Home pixels unchanged), `components/Admin/AdminTable.tsx` (hover-only table, eyebrow
headers, `__sort` button-in-th, `__actions`, `__secondary`, `__empty` row), `components/Admin/FactList.tsx`
(`<Fact label wide>` dl grid for demographics; `.fact-list__item dd` is what VIS-008 and PAT-004 now target),
`.admin-toolbar/__search`, `.admin-section` spacing. `DatePickerField.scss` makes the react-datepicker wrapper
block-level (Add Operation now reuses `DatePickerField`). `--guided-line-height-*` published to :root.
`ExpandableText` deleted (templates table shows real columns instead of JSON). Baseline literals unchanged (86/20).

**Declared delta:** VIS-007/008/009 restyled; VIS-012 new; VIS-006 unchanged (the quick launcher lives inside
the closed "Launch by ID" modal, so its restyle is not in any snapshot). Behavior changes that are not pure
styling, flagged in the PR: `type="search"` input, sortable headers are buttons with `aria-sort`, empty-state
rows, form submit labels ("Add Operation", "Create Template", "Create Patient"), `CreatePatientForm` controlIds
fixed (were `height`/`weight`), case picker shows its placeholder when empty. PAT-004 (core smoke) selectors
updated — a forced test change, called out to Ryan.

See [[project-or2863-design-foundation]], [[project-or2994-admin-shell]].
