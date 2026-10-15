---
name: project-or3005-admin-footer-in-flow
description: "OR-3005 admin footer in flow (Task under OR-2863) — DONE 2026-10-14: PR #4681 merged into the epic branch (2b17f4a96), worktree removed; footer in flow via flex-column pages + margin-top auto; only 13 tall-page captures rebaselined"
metadata:
  type: project
---

OR-3005 (Task, DONE 2026-10-14, assigned Ryan). Worktree `~/dev/worktrees/OR-3005-admin-footer-in-flow`,
branch `feature/OR-3005-admin-footer-in-flow` (reset onto the epic branch @ 8bc1b8be9 after workon cut it
from main). [Draft PR #4681](https://github.com/guidedclinical/orci/pull/4681) → `epic/OR-2863-design-foundation`,
opened 2026-10-14 with the PNGs already committed (d3cb48ae0 code, 37ae56558 baselines). Jira comment posted.
**Merged 2026-10-14** as 2b17f4a96 into the epic branch; `worktree-done` clean; ticket moved to Done. The epic session still needs to pull and regate.

**What shipped:** `Footer.tsx` non-clinical variant drops `fixed-bottom`; `.app-footer { margin-top: auto }`;
`.admin-page` and `.home-page` are `display:flex; flex-direction:column` (height from `.guided-page`'s
`min-height: 100vh`), `padding-bottom` hacks removed; `.admin-page__main` margin `space-4 0`; Home's
`<Footer />` moved outside the `Container` for full width. Clinical `Footer` untouched.

**Lessons:** (1) The in-flow footer lands exactly where the fixed one did on pages shorter than the viewport,
so only tall-page full-page captures move — 13 PNGs (VIS-006, 010, 012, 015, 018, 020, 022, 025–027), each
20–44 px shorter from the dead padding. The ticket's "VIS-006–010" guess was both too wide (007–009 are short)
and too narrow (012–027 postdate it). Always diff the artifact byte-for-byte rather than trusting the declared
delta. (2) `check:cascade` reports the exact selector set; a clean result here = 4 changed / 0 / 0 / 0.
(3) Chrome's `resize_window` is a no-op on a maximized window — measure layout via a JS probe
(footer rect vs `scrollHeight`/`innerHeight`) instead of relying on viewport screenshots. (4) The rebaseline
dispatch finished in ~10 min this time (gate run 38583726069).

See [[or2863-child-session-sop]], [[project-or2863-design-foundation]], [[project-or3004-vis010-fixture]].
