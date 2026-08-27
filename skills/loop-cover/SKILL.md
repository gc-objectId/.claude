---
name: loop-cover
description: Turn a validation's proposed tests into real automated coverage — curate the proposals with Ryan, write only what survives, run it, and open a draft PR. Use when invoked as /loop-cover, when `loopcmd cover OR-XXXX` launches a session, or when Ryan asks to write the automation from a validated ticket.
---

# Loop cover

A validation proposed tests. This turns the ones worth having into a draft PR. Growing this coverage
is the point of the whole loop — a ticket that closed and took its proposals with it was a loss.

A briefing has been generated at `~/.claude/jira-watch/state/cover-briefing.md`: the source ticket's
proposals, its automation assessment, and the validation evidence behind them. **Read it first.**

## 1. Curate — this part is a conversation

Go through the proposals with Ryan. For each, say whether you think it earns its keep and why. Push
back as readily as you agree; a proposal that duplicates solid existing coverage, or that only
restates a unit test the fix already shipped, should be declined.

Weigh:
- does it cover something the shipped tests genuinely cannot see (usually the engine-level or
  end-to-end shape, where mocks hide the real failure)?
- is it the negative or edge case, rather than the happy path?
- will it still be true in six months, or is it pinned to today's fixtures?

**Record the outcome as you go, rewording included.** Curation changes the proposals — that is the
point of it — and anything agreed only out loud is lost:

```
automation.sh amend OR-2743#0 "the version actually agreed"
automation.sh add OR-2743 "something curation invented that no session proposed"
automation.sh decline OR-2743#1 "why"
automation.sh done OR-2743#2            # only once it is genuinely written
```

Amended text replaces the original everywhere afterwards. When curation is settled, run
`automation.sh open OR-2743` and read it back — that list is what you are about to build, and it is
the last chance to catch a gap between what was agreed and what was recorded.

If Ryan launched this to curate the backlog rather than to build one ticket, **stop after step 1**.
Record every decision and hand back the numbers; do not create tickets, branches or tests.

## 2. Branch

**The work goes on the original ticket.** The coverage exists because of that ticket's code change,
so its branch and PR should say so.

```
~/.claude/bin/worktree-create.sh OR-2743 <slug>
```

If several tickets were named, they share **one** branch and **one** PR — branch from the first, and
give the PR a `Fixes` line per ticket. Grouping is right when their coverage lands in the same test
files and wrong when it does not; say so if the group looks incoherent.

The prefix comes from that ticket's own Jira issue type, so a Bug gets `bugfix/`. Exit 3 means a
branch or worktree for it still exists — surface that, do not work around it; it usually means an
earlier run was never torn down.

Do **not** create a separate automation ticket. `automation.sh ticket` exists only for when Ryan
explicitly asks for one, and it is not the default.

Then `cd` into the printed directory. All work happens there, never in `~/dev/orci`.

## 3. Write only what survived

Repo conventions matter here:

- qa-suite: `PREFIX-NNN: Description`, one prefix per spec file, exactly one tier tag. Edge cases and
  negatives are `@supplemental`, never `@core` — core is mandatory every-run coverage.
- Backend: repository/`@DataJpaTest` tests belong in `orci-repositories`, not `orci`. `*Test` runs in
  CI; `*IntegrationTest` is excluded and manual.
- Rule engine tests extend `BaseTest` and use the `assert***` helpers.
- No comments unless a genuine non-obvious constraint needs one line.
- Apply the can-it-fail check to every absence assertion you write: make it go red once, then revert.
  An assertion nobody has watched fail is not coverage.

## 4. Run them, and report what actually happened

Run the tests and paste the real counts, not a summary of intent. Print the exact commands so Ryan
can re-run them — `cd` plus the command; qa-suite always via the npm `:local` scripts with `--`
pass-through, never raw `TEST_ENV=local npx playwright`.

**Hard stops. Report and wait, do not work around:**
- a test had to be changed to pass
- production code had to be touched to get green
- the run surfaced something real about the feature
- qa-suite e2e against a shared environment

## 5. Gate, then PR

```
~/.claude/bin/automate-gate.sh <worktree>
```

It refuses on non-test files, added `@Disabled`/`.skip`, or any assertion removed from an existing
test. If it refuses, fix the cause — never argue with it.

Then commit (`OR-NNNN: short imperative summary`, no Co-Authored-By, no generated-with footer), push,
and `gh pr create --draft`. Draft always; Ryan marks ready.

Finally mark the written proposals `done` and tell Ryan the PR URL.

## Boundaries

- Write **only** proposals Ryan kept. Not the others, however tempting.
- Never touch production code. That is what the gate is for, and reaching for it means the task
  changed shape — say so instead.
- Do not address PR feedback from this session. The draft PR is Ryan's review surface; an agent
  iterating on its own review removes the only human checkpoint left.
- After it merges, the close-out is `loopcmd teardown OR-NNNN`, not something to do here.
