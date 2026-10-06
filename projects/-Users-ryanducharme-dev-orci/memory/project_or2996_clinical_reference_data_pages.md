---
name: project-or2996-clinical-reference-data-pages
description: "OR-2996 admin clinical reference data pages — DONE 2026-10-05: PR #4636 (restyle) and #4637 (rebaseline) merged into epic/OR-2863-design-foundation (8567a6a07), worktree gone; VIS-013–018 from reference-data-stub.ts, next free VIS 019; Vite-port+8080 local recipe; sibling-merge and premature-PR lessons"
metadata:
  node_type: memory
  type: project
  originSessionId: 7f3d4fc8-b481-4280-b4ca-5e4268063517
  modified: 2026-10-05T17:18:36.748Z
---

OR-2996 (Story under OR-2863, Ryan) — worktree `~/dev/worktrees/OR-2996-admin-clinical-reference-data-pages`,
Vite **3004** (per the child SOP port table), proxied to Ryan's 8080. [Draft PR #4636](https://github.com/guidedclinical/orci/pull/4636) → epic branch opened 2026-10-05; Jira comment posted; rebaseline dispatch 37347934822 on 6fda686d5 PNGs landed via follow-up [PR #4637](https://github.com/guidedclinical/orci/pull/4637) because Ryan merged #4636 before the rebaseline run finished (see [[feedback-pr-only-when-mergeable]]). **DONE 2026-10-05**, epic @ 8567a6a07, worktree removed. `workon` built it from main; reset to
the epic tip before the first commit.

**Visual cases:** VIS-013 medications (+ detail dialog), VIS-014 allergy reactions, VIS-015 config files (+ upload
dialog), VIS-016 dosing, VIS-017 citations, VIS-018 practitioners — all served from
`qa-suite/visual/reference-data-stub.ts` (six GET routes incl. paginated practitioners + capabilities). Next free
VIS id after this ticket: **019**. Tenant is picked through the page's react-select (`getByRole("combobox").first()`
→ fill → Enter → blur). Manage Data keeps inactive tab panes mounted, so row counts must be scoped to
`.tab-pane.active`.

**Local run recipe that works without a second backend:** `BASE_URL=http://localhost:3004 npm run visual:local --
--no-deps --grep "VIS-01[3-8]"` — login posts to `/api/login/basic`, which Vite proxies, so the branch frontend on
the Vite port against Ryan's main 8080 is enough for admin pages whose data is stubbed. Against 8080 directly the
epic-branch `uiLogin` fails (`.home-hero` is epic-only). First run writes darwin PNGs, second compares.

**Sibling merge lesson (OR-2995 merged mid-session):** it took VIS-012 and added `AdminPageHeader`, `AdminTable`
(`admin-table__secondary/actions/empty`), `admin-toolbar(__search)`, `admin-section`, `SectionHeader`, `FactList`.
The before-capture dispatch on the pre-merge base was cancelled, the branch rebased (conflict = both tails of the
visual spec/md; resolve ours+theirs and renumber), re-pushed, re-dispatched. Check the epic's spec for the last VIS
id before numbering.

**Restyle shape:** pages use AdminPageHeader + `admin-toolbar` with a new `TenantScope` (eyebrow "Tenant" +
TenantPicker `inputId`); AdminTable everywhere; new shared bits: `.guided-tag` (surfaces.scss cream chip),
`.admin-tabs`, `.admin-empty` (prompt/loading/empty), `.admin-scope`, `.admin-section__lede`, `.admin-help-term`,
`.admin-toolbar__filter`, `.admin-table--selectable`, `.admin-table__tags`, navy links in tables. `<code>` for tenant
ids/file names replaced with `<strong>` (Bootstrap code pink is a literal). Cascade gate: 14 added, 0 changed.
Medications search is case-sensitive by accident (query not lowercased) — Ryan chose to leave it, flag in PR.

See [[or2863-child-session-sop]], [[project-or2863-design-foundation]], [[project-or2994-admin-shell]].
