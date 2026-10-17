---
name: project-or3077-admin-review-fixes
description: "OR-3077 six admin fixes from the epic's pre-PR review — DONE 2026-10-16, PR #4719 merged into the epic (a632d99), worktree gone; spec diff approved, on the ticket, merged verbatim"
metadata:
  node_type: memory
  type: project
  originSessionId: bb62de9a-a190-48b3-b6cf-547362eb2718
  modified: 2026-10-16T16:34:34.313Z
---

Worktree `~/dev/worktrees/OR-3077-admin-review-fixes`, branch `feature/OR-3077-admin-review-fixes`, fast-forwarded onto the epic
(`git merge --ff-only` worked; `reset --hard` is classifier-blocked), then rebased onto c4de33349 after OR-3076/3003/3079 merged.
Pushed on Ryan's "push it" 2026-10-16: [PR #4719](https://github.com/guidedclinical/orci/pull/4719) (draft, base epic), commit 396d8e68f; /security-review clean; IMPLEMENT comment posted. **DONE 2026-10-16:** merged into the epic as a632d99 (16:43Z), `worktree-done` exit 0, merged spec diff verified identical to the approved one, ticket moved to Done. Vite 3031 stopped.

**Approved by Ryan 2026-10-16, verbatim in the ticket's Acceptance criteria:** admin-shell R1 (return target keeps the query);
in-case-overlay R8 narrowed, R16 "patient" → "PMRN" (HL7 Messages patient filter stays empty, its id isn't always the PMRN),
R18 added (Escape cancels a case-tab edit in place of closing the overlay). med-admin-simulation unchanged (R10/R28 already
required the trim). Next free ids: in-case-overlay R19, admin-shell R30, AUTH-012, LAUNCH-012, SIM-012.

**Decided:** harness adds the launched tenant to its four fixed tenants and seeds the PMRN input; a changed unsaved Operation
date reverts on Escape, an unchanged one lets Escape close the overlay; Notification/Reporting `initialErrors` come from the
same validator, so a fully seeded form starts enabled.

**Why the old Escape handling could never work:** react-bootstrap's Modal listens on `document`, a `window` listener
(the deleted `useKeyPressed`) fires after it, so only a React `onKeyDown` on the editor can `preventDefault` in time.
Shared helper `utils/keyboard.ts` `cancelOnEscape`.

**Evidence:** AUTH-011, LAUNCH-010, LAUNCH-011, SIM-011 green on 3031; red on 3001 (epic tip without the fix), with
flip-and-revert per LAUNCH-010 section. Allergy reset + Event Center label validated by hand in Chrome on 3031 vs 3001.

**Gotchas:** AUTH-010, LAUNCH-009, SIM-010 fail against 8080 because it's a main-build backend (no epic server changes), not a
regression. Sibling sessions share demo-qa, so globalSetup/launch occasionally fails transiently; rerun. The Chrome extension
sends keys via CDP to the page, bypassing an open native date picker, so it cannot test picker-open Escape.

See [[or2863-child-session-sop]], [[project-or2992-in-case-overlay]].
