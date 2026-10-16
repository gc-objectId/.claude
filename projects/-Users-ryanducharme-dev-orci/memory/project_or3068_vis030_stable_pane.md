---
name: or3068-vis030-stable-pane
description: "OR-3068 — VIS-030 in-case overlay pane height flake: root cause is the PMRN wrapping 3 vs 4 lines, fixed by hiding the pane instead of masking it; DONE, PR #4711 merged into the epic 2026-10-15"
metadata:
  node_type: memory
  type: project
  originSessionId: d1a57f51-6509-45e8-9f54-eebd108b6116
  modified: 2026-10-15T19:29:51.436Z
---

**DONE 2026-10-15:** PR #4711 merged into the epic branch (epic @ a8d76b382), worktree removed, ticket Done via `~/.claude/bin/jira.sh` REST helpers after the Atlassian MCP timed out on writes (`. ~/.claude/bin/jira.sh; jira_add_comment KEY "text"; jira_transition_to KEY Done` — v2 comment API, plain text, bare URLs).

**Root cause (not what the ticket guessed).** The Patient Demographics pane is a five-column fact grid. The suite's patient PMRN is `vis-fake-<random uuid>` (server appends `-fake-` + UUID to the prefix), and at 1280 px that value wraps to three or four lines depending on the glyph widths of the hex — proportional font, random characters. A Playwright mask box tracks its element, so the masked pane's box changed height by one line (~24 px). "Pediatric Status" was present in the failing render (page snapshot in `error-context.md`); the context is set once from the launch response, so no row arrives late.

**Why hide rather than mask:** same rule as `VOLATILE_TEXT_CSS` in the visual spec — content whose geometry varies per run cannot be masked, only hidden. The pane was already masked, so nothing graded was lost.

**Latent siblings, not fixed here:** VIS-008 masks the PMRN/MRN fact values on the admin patient page (same wrap risk if the column is narrow enough); the overlay `.modal-title` mask width follows the case-id digit count.

**Local run was skipped on purpose:** qa-suite `globalSetup` resets `TENANT_CLIENT_ID` on the target app, and the env files are unreadable to Claude (hook + permission deny), so running against Ryan's 8080 risked resetting the wrong tenant. tsc + `check:tags` were the local gate; CI is the real one.

See [[or2863-child-session-sop]], [[project-or2863-design-foundation]].
