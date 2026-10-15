---
name: project-or3050-event-center-unknown-case
description: "OR-3050 Event Center refuses unknown/blank case — IMPLEMENT on the OR-2863 epic branch; commit a593d95ca pushed 2026-10-14, DONE 2026-10-15: PR #4690 merged into the epic (96adf4254), worktree gone, ticket moved to Done; validated end to end on an 8081 branch backend"
metadata:
  node_type: memory
  type: project
  originSessionId: 2ddeaeb2-3f29-487e-abf3-640895f64bcc
  modified: 2026-10-14T20:25:00.398Z
---

OR-3050 (Story under OR-2863, assigned Ryan). Worktree `~/dev/worktrees/OR-3050-event-center-unknown-case`,
branch `feature/OR-3050-event-center-unknown-case` reset onto the epic head (39115be72) per [[or2863-child-session-sop]].
Vite port 3017 (3016 was already taken by a sibling), branch backend on 8081.

**DONE 2026-10-15 — PR #4690 merged into the epic branch (merge 96adf4254; commits a593d95ca + 9c864b640), `worktree-done` clean, ticket moved to Done. The epic session still needs to pull. The first PR gate run was cancelled mid-suite with no failures (cause unknown, rerun in flight at merge); static-analysis PMD `127.0.0.1` in ServerInfoController is epic-wide from OR-2990, unfixed.** admin `category-event` endpoint now answers 400 for a blank case id
and 404 "Unknown case <id>" when `operationService.getOperation` finds nothing, *before* calling the shared
`EventService.handleEvent` (which must keep ignoring unknown cases for the HL7 feed). Event Center disables cards
until both tenant and case id are set and shows the server message in the failure toast via a new shared
`httpErrorMessage` in `utils/request.ts` (lifted from ConfigFileUploadModal). Spec CHANGE on `event-center.md`
R8/R9/R20/R22 + History line, in the same PR (spec README: never before, never after). `EventControllerTest`
(WebMvcTest slice, 5 tests) — red check: 2 fail on the old controller. PMRN stays optional (server resolves by case id).

**Rulings 2026-10-14:** disable cards rather than toast-on-click (accepted the VIS-024 rebaseline cost); PMRN optional.

**Validation 2026-10-14 on 3017→8081:** tenant only → cards disabled; unknown case → toast "In Room failed: Unknown
case no-such-case" + 404 in log; `OR2581-POS` (demo-demo, blank PMRN) → "Sent In Room" + 2 operation_events rows.

**Lessons:** the pre-commit prettier hook (older version) reverted a line my newer `npx prettier --write` had
reflowed — a failed commit still let `git push` + `gh workflow run` fire on the old SHA (wasted dispatch
38631143679, cancelled). Chain `git commit && git push` so a hook failure stops the sequence. Fresh worktree had
no `node_modules` in either webapp or qa-suite (`npx tsc` printed "not the tsc you are looking for").

See [[project-or3043-baseline-feature-specs]], [[project-or2863-design-foundation]].
