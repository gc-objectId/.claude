---
name: workon
description: Status-driven SOP for addressing a Jira ticket after the `workon` shell function has created the worktree. Determines implement-vs-validate mode from the ticket's status, pulls Jira + GitHub context, then executes the standard ticket flow. Use when asked to "work on", "address", "pick up", or "start" an OR ticket, or invoked as /workon [OR-XXXX].
---

# Workon — Ticket SOP

Drive a ticket end-to-end from its Jira status. The `workon` shell function already ran before this session: the worktree exists and the branch is checked out. Never create or switch branches.

## Inputs

- **Ticket** — from the argument (e.g. `OR-2620`). If absent, derive from `git branch --show-current` (branch contains `OR-NNNN`). If neither yields a ticket, ask — never guess.
- **Jira cloud:** `guidedclinical` — cloudId `f0b968d3-2cbb-41a5-ac92-b80f2cd94e76`. If a tool rejects it, re-derive via `getAccessibleAtlassianResources`.

## Step 1 — Confirm context

1. `git branch --show-current` and `git status` (one call).
2. Branch must contain the ticket number, and its prefix must match the Jira issue type (Bug→`bugfix/`, Story/Task→`feature/`, Epic→`epic/`). On mismatch, flag it and rename with `git branch -m` before any push.
3. Uncommitted changes from prior work: surface them before writing any files.

## Step 2 — Pull context (parallel where possible)

- **Jira:** `getJiraIssue` with comments (`fields` including `comment`, `parent`); `getJiraIssueRemoteIssueLinks` for Sentry/other links. Read the parent epic if there is one. Do **not** assign or transition — Ryan manages ticket lifecycle.
- **GitHub:** `gh pr list --search "OR-NNNN" --state all --json number,title,state,url,mergedAt` and `git log --all --grep="OR-NNNN" --oneline`. If a PR exists, pull its diff (`gh pr diff`) — for validate mode it *is* the thing under test; for implement mode it's prior/related work to build on.
- **Sentry-created tickets** embed the error + a Sentry link in the description — extract ip/uri/userAgent/message clues from there.

## Step 3 — Determine mode from status

| Status | Mode |
|---|---|
| To Do, In Progress | **IMPLEMENT** |
| Ready for Testing, Testing | **VALIDATE** |
| Done | Stop — surface it and ask what's intended |
| Anything else | Ask |

State the chosen mode and a one-paragraph summary of the ticket before starting work.

## IMPLEMENT mode

Goal: one-shot a production-quality implementation. Questions are welcome — but **batch them up front** after the deep dive, not scattered mid-implementation.

1. **Deep dive first.** Read every relevant code path end-to-end — callers, config, tests, adjacent patterns — not just the obvious file. For bugs, establish the root cause and be able to explain the failure mechanism before writing a fix; don't patch symptoms.
2. **Clarify if genuinely ambiguous.** If the ticket admits multiple reasonable implementations, ask (AskUserQuestion) with a recommendation — one round of questions, then execute.
3. **Implement to the codebase's standards.** Reuse existing utilities/patterns (check before writing new code), idiomatic and industry-standard, thorough — handle the edge cases the deep dive surfaced. Add/update automated tests where the change warrants them.
4. **Guardrails:** config-file vigilance (no local overrides in the diff); run `/security-review` before any PR touching auth, file I/O, path/archive handling, or input validation.
5. **Hand off for local testing:** end with the exact validation commands (`cd` + test command; qa-suite always via npm `:local` scripts with `--` pass-through), or explicit manual steps if no automated tests. Then follow the standard ticket flow in global CLAUDE.md: wait for Ryan's tests-pass confirmation, which is standing authorization to commit → push → `gh pr create --draft` as one uninterrupted sequence.

## VALIDATE mode

Goal: a manual-validation verdict that lets Ryan close the ticket (= deploy-ready), plus an automation assessment. The implementation is already merged — the app under test is the **main** build (see "validate against main"); test code lives on this branch.

1. **Manual validation first**, per the Validation Protocol in global CLAUDE.md:
   - Run the positive scenario AND the negative/inverse. The negative is usually where the ticket's value lives.
   - **Flip-and-revert every "should not happen" check** — make the condition fire, watch the check go red, revert. A green absence assertion is meaningless until seen red.
   - Prefer the real app UI (local build of main is fastest — logs in console) over the test harness when the scenario is reachable through it.
2. **Automation assessment.** Survey existing coverage (backend unit/integration in `orci/src/test`, qa-suite e2e) for this behavior. Decide per gap: unit vs integration vs e2e, and whether it's worth locking in at all. Don't duplicate solid existing tests; favor negative/edge cases.
3. **Write the tests that made the cut.** Edge-case/negative tests go in the supplemental tier, not core. qa-suite conventions: `PREFIX-NNN` IDs, exactly one tier tag, numeric order, `npm run check:tags` passes, `npx tsc --noEmit` clean.
4. **Hand off:** run commands from *inside this worktree* (qa-suite npm `:local` scripts), then the standard commit/push/draft-PR flow after Ryan confirms.
5. **Report the verdict plainly:** validated (deploy-ready) or not, with evidence. Don't comment on or transition the ticket unless asked.
6. **Draft a validation comment.** End every validation with a ready-to-paste Jira comment in a fenced block, written in Claude's voice (first person — Ryan quotes or paraphrases it, per "PR replies manual"). Do **not** post it to Jira. Contents: verdict line (validated/not, deploy-ready or blockers), how it was validated (positive, negative, and the flip-and-revert red check — one line each), and what automated coverage now locks it in (test IDs/tiers). Keep it tight — a reader skimming the ticket should get the whole story in ~10 lines.

## After merge (either mode)

When Ryan confirms the merge: run `worktree-done` from inside the worktree, then surface the session's ticket(s) with status and ask whether to move the completed one(s) to Done — transition only on confirmation.
