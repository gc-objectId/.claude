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

- **Jira:** `getJiraIssue` with comments (`fields` including `comment`, `parent`); `getJiraIssueRemoteIssueLinks` for Sentry/other links. Read the parent epic if there is one. Do **not** assign or transition at this stage — the only sanctioned transitions are the deploy-ready close-out (VALIDATE step 3) and the verified close-out below.
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
5. **Verify, then close out:** run the tests yourself per the verification gate below, report the actual output, and continue into the close-out unless a hard stop applies. Always print the exact commands you ran (`cd` + test command; qa-suite always via npm `:local` scripts with `--` pass-through) so Ryan can re-run them, and give explicit manual steps when there are no automated tests.

## VALIDATE mode

Goal: a manual-validation verdict that closes the ticket (= deploy-ready), plus an automation assessment. The implementation is already merged — the app under test is the **main** build (see "validate against main"); test code lives on this branch.

1. **Manual validation first**, per the Validation Protocol in global CLAUDE.md:
   - Run the positive scenario AND the negative/inverse. The negative is usually where the ticket's value lives.
   - **Flip-and-revert every "should not happen" check** — make the condition fire, watch the check go red, revert. A green absence assertion is meaningless until seen red.
   - Prefer the real app UI (local build of main is fastest — logs in console) over the test harness when the scenario is reachable through it.
2. **Report the verdict plainly:** validated (deploy-ready) or not, with evidence.
3. **Deploy-ready close-out — post the validation comment and move the ticket to Done as soon as the verdict is deploy-ready.** Don't wait for the automation work: the Done transition is the team's signal that the change is deploy-ready, even though a tests PR usually follows. The comment (Claude's voice, first person): verdict line, how it was validated (positive, negative, and the flip-and-revert red check — one line each), a link to the merged implementation PR by full URL, and the automation plan (coverage to be added, or why none is warranted). Keep it tight — a reader skimming the ticket should get the whole story in ~10 lines. If the verdict is **not** deploy-ready, post nothing, skip the transition, and surface the blockers instead.
4. **Automation assessment.** Survey existing coverage (backend unit/integration in `orci/src/test`, qa-suite e2e) for this behavior. Decide per gap: unit vs integration vs e2e, and whether it's worth locking in at all. Don't duplicate solid existing tests; favor negative/edge cases.
5. **Write the tests that made the cut.** Edge-case/negative tests go in the supplemental tier, not core. qa-suite conventions: `PREFIX-NNN` IDs, exactly one tier tag, numeric order, `npm run check:tags` passes, `npx tsc --noEmit` clean.
6. **Verify, then close out:** run the tests from *inside this worktree* (qa-suite npm `:local` scripts), report the actual output, and continue into the close-out unless a hard stop applies — see the verification gate below.

## Verification gate (either mode)

Run the tests yourself and report the real output — pasted counts, not a summary of your intent. For **backend unit/integration tests** that is the gate: a passing run is standing authorization to continue straight into the close-out below without pausing. Re-running the same command in the same JVM against the same database catches nothing; what actually needs a human is whether the diff is the right work, and that happens on the draft PR.

**Hard stops — report and wait, do not proceed:**

- **A test had to change to pass.** An assertion loosened, an expected value edited, a case deleted or `@Disabled`. That is a claim about what correct behavior is, and it is Ryan's call.
- **Production code was touched to get green.** Same reason, higher stakes.
- **The run surfaced something about the feature** — an unexpected failure, a warning that implies a real gap, coverage that turned out to be inert. Green with a surprise in it is not green.
- **qa-suite e2e or anything against a shared environment.** One local pass is weak evidence there: flake and environment drift are real, and `demo-qa` gets reset out from under you. Report the run and wait.

Everything else in the close-out is unchanged — draft PRs only, comment sweep before staging, `/security-review` before any PR touching auth, file I/O, path/archive handling, or input validation.

## Close-out (either mode)

Triggered by your own passing verification with no hard stop (see the gate above), or by Ryan reporting all green. Either way, run this **entire sequence without pausing between steps**:

1. **Comment sweep, then commit.** Before staging, re-read every comment in the diff (javadoc included) and ask: does this document the code — a constraint, invariant, or non-obvious behavior the code can't show? Delete anything addressed to the reviewer: justifying the change, explaining what coverage was missing, comparing to other tests/files, or recording history — that content belongs in the PR body or Jira. Length follows need: a one-line constraint stays one line; a genuinely complex invariant can take more. Commit message follows repo convention (`OR-NNNN - Description`), no Co-Authored-By or generated-with footers.
2. **Push** (`--force-with-lease` only if the branch was rebased).
3. **`gh pr create --draft`** — only if no PR exists yet; otherwise the push updates the open PR in place. Never frame the description as "test-only / no production code changes" — everything merging to main is production code; if the distinction matters, say "no changes to runtime behavior" and describe the diff on its merits.
4. **Check the ticket's current status** (`getJiraIssue`) — don't assume it's where Step 3 left it.
5. **Post a Jira comment**, mode-dependent, in Claude's voice. Always link the PR by full URL (markdown link, e.g. `[PR #4188](https://github.com/...)`) — the comment is drafted before the PR exists, so insert the link at post time:
   - **VALIDATE mode** — the validation comment and Done transition usually already happened at the deploy-ready verdict (VALIDATE step 3); in that case post only a short follow-up linking the tests PR and the coverage it adds (test IDs/tiers), and skip step 6. If the deploy-ready close-out hasn't happened yet, post the full validation comment now — only if manual validation is complete **and passed**.
   - **IMPLEMENT mode** — a comment explaining the fix/implementation: root cause (for bugs), what changed and why, and what test coverage locks it in. Same ~10-line discipline.
6. **Transition the ticket to Done** (skip if already Done from the deploy-ready close-out) — gated on the comment above being warranted: VALIDATE requires a passing validation; IMPLEMENT requires the work to be complete on the PR. If validation failed, work remains, or the situation is ambiguous (e.g. blockers found, scope grew), post nothing beyond findings, skip the transition, and surface why.

If any step fails (push rejected, transition unavailable), stop the sequence and surface it — don't skip ahead.

## PR feedback (either mode)

Address feedback together: draft reply text for Ryan to post — in Ryan's voice, super simple, high level, conversational (never post PR replies directly) — provide test commands for non-trivial fixes, and wait for Ryan's confirmation before pushing feedback commits.

## After merge (either mode)

When Ryan confirms the merge: run `worktree-done` from inside the worktree. It removes the worktree, deletes the branch (including the squash-merge case, which it detects against `origin/main`), and verifies its own result — exit 0 means both are gone, so no re-checking is needed. A non-zero exit means the branch was genuinely unmerged and was left in place; surface that rather than forcing it. If the ticket wasn't already moved to Done at the deploy-ready close-out or verified close-out — e.g. the close-out was deferred while a validation-surfaced fix merged — the deploy-ready verdict lands now: post the validation comment and move it to Done, no ask. Only ask if the ticket's completeness is genuinely ambiguous.
