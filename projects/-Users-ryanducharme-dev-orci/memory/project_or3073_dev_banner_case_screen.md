---
name: project-or3073-dev-banner-case-screen
description: "OR-3073 (Bug under the design epic): dev banner pushed the case screen under the fixed footer + stored the raw session id; draft PR #4721 into the epic 2026-10-16, In Progress until merge; R38/R39 CHANGE approved (per-browser dismissal)"
metadata:
  node_type: memory
  type: project
  originSessionId: 05b9ea45-00f1-404a-825d-4058ba721d0b
  modified: 2026-10-16T16:57:35.460Z
---

Worktree `~/dev/worktrees/OR-3073-dev-banner-case-screen`, branch `bugfix/OR-3073-dev-banner-case-screen`, draft
[PR #4721](https://github.com/guidedclinical/orci/pull/4721) into the epic, head 3d231660f on epic a632d9985. Jira
implementation comment posted; ticket stays In Progress until Ryan merges.

Ryan changed the ticket at 16:30 (dismissal outlasts the sign-in session, no session id stored) and approved the
front-door CHANGE: R38 = stops showing on this site in that browser across page loads and sign-ins; R39 = shows again
when the site's data is cleared; R38 Decision rewritten; "session id" dropped from Inputs. Approved diff lives in the
ticket's `### Approved spec diff`; commit 1 is that diff (rebased over OR-3075's front-door edits).

Code: `DevModeBanner` = plain `devModeBanner.dismissed` localStorage flag + publishes its measured height as
`--dev-mode-banner-height`; `.app-body` and `.guided-page` subtract it. Tests: AUTH-010 (still hidden after re-login,
shown after localStorage.clear) `[R36, R38, R39]`, AUTH-012 `[R38]` (no session id in storage), AUTH-013 `[R38]` (no
flash on reload) — renumbered at rebase because OR-3077 took AUTH-011; VIS-036 (case screen under banner, 1280x800).
Declared delta VIS-036 + VIS-011, from capture run 38932137721 (82 other PNGs byte-identical). Next free AUTH-014.

**MERGED 2026-10-16 16:54Z** (merge 7b8514faf, before its PR gate 38935399208 finished); `worktree-done` ran clean.
Follow-up filed: OR-3088 (child of OR-3054, no links) — global-setup's stale-token sweep revokes concurrent runs' tokens,
which caused this session's afterAll/teardown 401s.

**Rebased 2026-10-16 onto d5a28568b (OR-3078 merged):** head 0caca5b30; OR-3078's R38/R39 Known gap removed, its R58/R59
kept, `.guided-page` keeps its `--guided-color-ground` background. OR-3070 and OR-3074 both claim VIS-037 (flagged to Ryan).

**Red-check technique:** run new tests against the epic workbench on 3001 (pre-fix build); the classifier blocks a
temporary security-weakening source flip. AUTH-010's new re-login step only runs in CI (needs the epic backend's host
rule; classifier denied `mvn install`/`package`/`spring-boot:run` this session).

See [[or2863-child-session-sop]], [[project-or3061-dev-banner-tests]].
