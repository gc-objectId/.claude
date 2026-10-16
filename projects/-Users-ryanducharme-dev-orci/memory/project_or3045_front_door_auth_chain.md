---
name: project-or3045-front-door-auth-chain
description: "OR-3045 + OR-3048 + OR-3047 chain — DONE 2026-10-15: PR #4689 merged into the epic (3cf3fe494), all three tickets Done; VIS-029 baseline follow-up PR #4700 merged 2026-10-15, worktree gone; next free VIS 030"
metadata:
  node_type: memory
  type: project
  originSessionId: 95b697e6-06ef-4315-809a-37ca066b30d1
  modified: 2026-10-14T20:28:13.566Z
---

Chain under OR-2863, worktree `~/dev/worktrees/OR-3045-front-door-auth`, branch
`feature/OR-3045-front-door-auth` (reset onto the epic; Vite port 3016 was used for this ticket).
**PR #4689 merged into the epic 2026-10-15 (3cf3fe494); OR-3045/3048/3047 moved to Done.** Ryan merged
before the VIS-029 recapture landed, so the two `server-not-responding` PNGs went in a follow-up draft PR from
`feature/OR-3047-vis029-baseline`, cut from the epic in the SAME worktree (`~/dev/worktrees/OR-3045-front-door-auth`,
the merged branch is deleted locally). PR #4700 merged 2026-10-15 and `worktree-done` ran clean; nothing left in flight. Lesson: a capture dispatch
runs on the branch SHA even after the remote branch is deleted, so the artifact stays usable; compare the whole
artifact against the epic before copying, since a sibling (OR-3050) rebaselined event-center in between.

**What landed:** `UserCheckFailed` sentinel in `types/User.ts` (`isLoggedIn` is now `typeof user !==
"symbol"`); non-403 user-info failures render `SignInCheckFailedDisplay` ("GuidedOR isn't responding" / "We couldn't reach the server to load this page.", reworded 2026-10-15 after Theo's review, +
"Try again" via `AsyncSpinnerButton`); `ProtectedRoute` shows `NotAllowedDisplay` to signed-in non-admins
instead of `/login?next=` (which looped with `LoginPage`'s logged-in redirect); `Home` renders the
tenant-row Patients/Templates menu only for admins. `MainNav.tsx` untouched on purpose (PR #4684 edits it).

**Spec:** `front-door.md` R21/R49 changed, R51/R52 added; `admin-shell.md` R2 changed, R28 added. Ryan
approved; diffs live in each ticket's `## Acceptance criteria` → `### Approved spec diff`. Next free ids:
front-door R53, admin-shell R29.

**Tests:** AUTH-005–009 in `qa-suite/smoke/auth-login.spec.ts` (next free AUTH-010). Verified red→green
against Vite 3016 proxied to Ryan's 8080 (`BASE_URL=http://localhost:3016 npm run test:local -- --grep
"AUTH-00[1-9]|PAT-003" --project=smoke-auth --project=smoke-data --no-deps`). AUTH-007 counts `page.on("load")`,
not `framenavigated`: React Router's boot `replaceState` fires the latter once more.

**Follow-ups done in the same PR (Ryan asked):** `LoggedOutUser` brand fixed to `"LOGGED_OUT"`; VIS-028 (not-allowed)
and VIS-029 (server-not-responding, renamed from sign-in-check-failed in the reword) added via `adminSession`'s new `signedInAs` option, baselines from
`gh workflow run pr-gate.yml --ref feature/OR-3045-front-door-auth -f update_visual_snapshots=true`. Next free
VIS 030. Rebased onto the epic after #4684/#4688 (MainNav.tsx → adminIndex.ts; only spec History lines conflicted,
keep both sides). Still open: `isLoaded` from `types/Loadable` may guard `user.name` elsewhere; `MainNavLinks` gone via OR-3051.

See [[or2863-child-session-sop]], [[project-or2863-design-foundation]], [[project-or3043-baseline-feature-specs]].
