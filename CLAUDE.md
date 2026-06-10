# CLAUDE.md — Global Preferences

## Teaching Mode

I'm building deep expertise across our stack. When making decisions, weave the *why* into the work naturally — like a senior engineer pair-programming, not a tutor giving a lesson. Never slow down or block progress to teach; just let the reasoning come through as part of the conversation.

Good moments to explain briefly:
- Why this approach over the alternatives
- What a pattern, annotation, or API does when it's something I haven't encountered yet
- What would go wrong without a particular fix or guard
- Trade-offs that shaped the decision

Skip anything obvious or that I've already shown I understand. A sentence or two is almost always enough.

## Code Quality

### Redundancy

Always check the codebase before writing new code. If something already exists that handles the concern — a utility, helper, shared module, or established pattern — use it. Don't introduce a parallel approach when one already exists. Extract and reuse over reinventing.

If you spot redundancy, dead code, or a missing abstraction while working on a task, flag it briefly.

### Standards & Best Practices

Default to the most idiomatic, industry-standard approach for the language, framework, and ecosystem. When multiple valid options exist, prefer the one that is most maintainable, most readable, and most consistent with the existing codebase. Clever or novel approaches need to clearly earn their complexity.

If the codebase deviates from best practices in a way that's relevant to the current task, flag it — but stay focused unless I ask to go deeper.

## Communication Style

Be terse and direct — no trailing summaries or recaps. Don't over-explain things I've already demonstrated understanding of. When in teaching mode, walk through the reasoning but let me execute manually. When I say "just do it," switch to execution mode and stop explaining.

Ask before making destructive changes or switching approaches mid-task. When making code changes across multiple tickets, wait for me to confirm I've committed before moving to the next one. Don't make changes spanning multiple tickets in a single edit without checking first.

When drafting replies to PR feedback or any response Ryan will post, write in Claude's voice (first person), not Ryan's. Ryan will quote or paraphrase — "Claude found this when troubleshooting: '...'" — so the reply should read naturally as coming from Claude, not ghostwritten as if Ryan said it.

## Jira Ticket Management

- I handle Jira ticket lifecycle manually (assignment, status transitions, epic updates) — do not auto-assign or auto-transition tickets. A GitHub–Jira integration may also move status on merge.
- Never create empty shell parent tickets — repurpose existing tickets or create new ones
- Epic descriptions should be factual — use "Complete" or "Pending" for phases, no editorial commentary like "approved plan" or "PR pending"
- Let ticket statuses and GitHub PR links convey state automatically — don't duplicate manually in descriptions
- When a ticket's scope changes during implementation, update the ticket description and create new tickets for broken-out work
- Prefix blocked/deferred ticket titles with [BLOCKED] or [DEFERRED]
- Show draft tickets for approval before creating — unless I say to create them all at once

## Git/PR Workflow

### Standard ticket flow (follow this every time)

**This flow triggers any time Ryan authorizes code changes — including a "yes" answer to a proposed feature, fix, or test addition. Do not write any files before completing step 1.**

1. **Identify the ticket** — If the OR ticket number is not explicit in the request, ask before doing anything else. Do not infer or guess. Once confirmed, check Jira for the epic/story for context. Do not auto-assign or transition status — Ryan manages ticket lifecycle.
2. **Confirm context** — Run `git branch --show-current`. The branch is already created by `workon` before this session started — do not run `git checkout -b` or switch branches. If the branch doesn't match the ticket, surface it before touching anything. Run `git status` — if there are uncommitted changes from a prior task, surface them before writing any new files.
3. **Implement** — Make changes. At the end of implementation, provide the exact commands Ryan needs to validate the work: a `cd` command to the relevant directory and the specific test command for any tests created or updated (e.g. `mvn test -Dtest=MyTest` or `TEST_ENV=local npx playwright test --grep "TC-XXX"`). Always prefix Playwright commands with `TEST_ENV=local`. If there are no automated tests for the change, provide explicit manual validation steps instead.
4. **Test locally** — Ryan runs the provided command. Wait for Ryan to confirm tests pass before committing anything.
5. **Commit → Push → PR** — Follow Ryan's explicit instructions fully in sequence. When Ryan says "commit and push" or "commit, push, and create PR", execute each step in order without stopping for confirmation between them. Only pause when the next action is ambiguous or wasn't explicitly included in the instruction. **All PRs open as drafts** via `gh pr create --draft`. Ryan marks ready for review manually.
6. **PR feedback** — Address feedback together. Provide test commands for any non-trivial fixes. Wait for Ryan to confirm before pushing feedback commits.
7. **After merge** — Ryan merges manually (remote branch is auto-deleted). When Ryan confirms the merge, run `worktree-done` from inside the worktree directory. **⚠ HARD REMINDER: Always run `worktree-done` from inside the worktree after merge — stale worktrees accumulate and the branch lingers locally.**

### Multi-session isolation (git worktrees)

`~/dev/orci` is the primary working directory. When a second ticket needs file changes while another session is already active there, create an isolated worktree instead of switching branches.

**Check first:**
```bash
git worktree list
```

**Create a worktree** using the `workon` shell function (run from any directory, before launching Claude):
```bash
workon OR-1234 auth-refactor     # fetches origin, creates branch + worktree, cds in
claude                           # launch agent in the isolated directory
```

The worktree lands at `~/dev/worktrees/OR-1234-auth-refactor/` on branch `feature/OR-1234-auth-refactor`. Branch, commit, push, and PR all happen from there. `~/dev/orci` is unaffected.

**Teardown** after PR merges, from inside the worktree:
```bash
worktree-done    # removes worktree directory + deletes local branch
```

**Rules:**
- Never run `git checkout`, `git branch -b`, or `git reset` in `~/dev/orci` while another session has an open worktree — branch switches affect running services (Spring Boot, Vite).
- A branch checked out in a worktree cannot also be checked out in `~/dev/orci` — git enforces this with an error.
- Worktrees are only needed for concurrent sessions. Single-ticket work stays in `~/dev/orci` as normal.
- Full reference: `~/dev/worktrees/CLAUDE.md`

### Rules

- **Execute git actions as explicitly instructed.** When Ryan says "commit and push" or "commit, push, and create PR", run them in sequence without pausing between steps. Do not autonomously push or create PRs when not instructed to — but when the instruction is explicit, follow it completely.
- Never add `Co-Authored-By` trailers to commits — Ryan is the sole author of all work
- Never modify the project root `README.md` — QA-specific and build-tooling notes belong in `qa-suite/tests-readme.md` or the project `CLAUDE.md`
- Never add co-author metadata to PR descriptions either
- After rebasing from GitHub UI, use `git pull --rebase` locally to sync
- Always use `workflow_dispatch` on a branch to validate new CI workflows before merging to main
- Uncommitted changes on the current branch must be surfaced before creating a new branch. Resolution is always a stash (`git stash push -m "WIP: <description>"`) — never discard, never mix into the new branch without explicit direction from Ryan.
- **Config file vigilance** — Before staging any changes to `application.yml`, `application-*.yml`, or any Spring config file, audit every changed line and confirm it belongs on that branch. Local testing overrides (e.g. `tenants.demo.qa.enabled: true`, feature flags, debug settings) must never slip into committed config. Flag any config diff for Ryan to review before staging.
- **No post-merge test plans in PRs** — Only include a test plan section in a PR description if there are steps verifiable before merge. Steps that require a deployment or merged build belong in the Jira ticket as a comment, not in the PR.
- **Security review before opening PRs** — Run `/security-review` before opening any PR that touches authentication, file I/O, path handling, ZIP/archive processing, or input validation. When implementing security guards, verify they fire at the right moment with the right value — not just that they exist. For blocking I/O calls in particular, confirm whether the method completes fully before control returns to the check.

## Validation Protocol

When I ask you to "validate" a ticket — e.g. "pull OR-XXXX for context and validate" — that phrase means the full flow below, not just reading the code:

1. **Pull the ticket for context** — read the Jira ticket and understand what shipped: the mechanism, the rules/files touched, and the acceptance examples. Find the merged implementation. (At Guided, dev work merges to `main` *before* validation, so the running app under test is the `main` build — see "validate against main" in memory.)
2. **Validate manually first** — exercise the change against the running `main` build:
   - Run the **positive** scenario (the behavior should happen) *and* the **negative/inverse** (it should NOT happen). The negative is usually where the ticket's value lives.
   - **Confirm any "should not happen" check can actually fail.** Temporarily flip the triggering condition so the thing *would* happen, confirm the check flips red, then revert. A green absence assertion is meaningless until you've watched it go red. This flip-and-revert is the core of the manual-validation step.
3. **Then automate where applicable** — write automated tests for the scenarios worth locking in. Check existing coverage first (don't duplicate solid unit tests); favor the negative/edge cases. Apply the same can-it-fail check to every absence assertion. Put edge-case/negative rule tests in the supplemental suite, not core (core = mandatory every-run coverage).
4. Provide the exact run commands and wait for my confirmation, per the ticket flow.
5. **Close out after merge** — I'll return to this session (whenever the PR merges) and confirm it was merged and ask to clean up. That's your cue to run `worktree-done` from inside the worktree (removes the worktree directory + local branch). After it succeeds, I exit the session. If `worktree-done` refuses (unmerged branch), surface that instead of forcing it.

## Testing & Development

- Always test against local before committing
- Use `npx playwright test --project=cv-core --no-deps` for fast iteration (skip smoke dependencies)
- Test names must follow TC-XXX naming convention consistently
- Tests should be ordered numerically in spec files
- When porting tests from old frameworks, verify current app behavior — don't assume old assertions are still valid
- Admin user for API setup, tenant user for UI interactions in clinical validation tests
- Always verify TypeScript compiles (`npx tsc --noEmit`) after code changes
- Check screenshots on test failures before guessing at fixes

## Claude Code Behavior

Save important learnings and patterns discovered during sessions to memory for future conversations.

### Agent Team Orchestration

When agent teams are enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), the main session coordinates across specialized subagents (product-analyst, qa-engineer, lead-developer, principal-engineer).

**The team lead (main session) owns all git write operations.** Agents never run `git checkout -b`, `git commit`, `git push`, `git rebase`, or any destructive git command. Agents only write files and report when their work is done; the team lead handles the git orchestration with user approval at each step.

**Branch management is the team lead's first responsibility.** Before dispatching any agent that writes files for a ticket:

1. Run `git status` and `git branch --show-current`. Check both the current branch *and* whether there are uncommitted changes.
2. If there are uncommitted changes, stop and surface them to the user before doing anything else — they may be in-progress work for a different ticket that shouldn't be mixed in.
3. If on `main`/`master`: ask the user whether to create a feature branch. Propose a name following the existing convention (e.g., `feature/OR-2402-description` or `epic/OR-XXXX-slug`). Wait for approval before running `git checkout -b`.
4. If already on a feature branch: confirm with the user that this branch is the right place for the work, then proceed.
5. Never silently create or switch branches.

**Commits happen at logical checkpoints, not by rigid rule.** As agents finish discrete units of work (spec drafted, tests written, feature implemented, review fix applied), the team lead asks the user whether it's a good moment to commit. Commit often enough to keep history meaningful; don't let a branch accumulate a massive untracked diff.

**Real-world actions require user approval** — the team lead pauses for explicit approval before: branch creation, every `git commit`, `git push`, PR creation, Jira ticket creation or edits, CI triggers, and migrations against shared environments. Don't batch multiple gated actions into one approval.

**PRs are created by the team lead** via `gh pr create` after Ryan confirms work is complete — see Git/PR Workflow above.
