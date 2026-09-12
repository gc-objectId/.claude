# jira-watch

Validates merged Jira tickets against a throwaway build of `main`, and closes the ones that earn it.

Ryan runs `loopcmd review`, which hands off to a Claude session. Everything below is what that sits on top of.

## The one command

```
loopcmd 8 2      # the autonomous half: validate 8 tickets, 2 at a time
loopcmd review   # the human half: a session that walks the queue with you
```

`review` gathers the mechanical parts into `state/review-briefing.md` — stranded worktrees, the
digest, the blockers for every ticket needing a decision, the coverage backlog, the eligible count —
then opens an interactive session running the `loop-review` skill. Shell does the mechanical work,
sessions do the judgment, skills hold the SOP.

`loopcmd session OR-XXXX` opens a session focused on one validation, cd'd into that ticket's worktree
if it still exists, with the evidence paths to hand.

`loopcmd review --shell` runs the same pass as plain shell prompts if you would rather not spend a
session on it.

Other verbs: `loopcmd` (watch tower), `loopcmd cover OR-XXXX`, `loopcmd teardown OR-XXXX`,
`loopcmd session OR-XXXX`, `loopcmd status`, `loopcmd applog` (one stream per live environment, so a
parallel sweep is fully visible), `loopcmd runner`, `loopcmd kill`, `loopcmd help`.
`recap`/`morning` alias `review`; `sweep 8 2` and `8 2` are the same thing.

## What a sweep actually does

`sweep` is the only verb that does work. Per ticket, in order:

1. **re-read status** — must be Ready for Testing or Testing, else abort. An unattended session must
   never pick up implementation work.
2. **reserved check** — a summary matching `LOOP_RESERVED_PATTERN` (default `^Analytics:`) is
   validated but every Jira write is dropped, because that work belongs to another reviewer.
3. **build** `origin/main` as a Jib image in `~/dev/worktrees/_loop-main` (lock-protected, ~40s warm)
4. **freshness** — does that build actually contain the ticket's merged fix? No merged PR, or a build
   that predates it, ends the run here. Nothing on the board is touched.
5. **pickup** — move to Testing, assign. Only now, once there is something real to validate.
6. **worktree** for the ticket, off `origin/main`
7. **ephemeral environment** — own compose project: Postgres, Valkey, the app on a free port.
   Schemas, migrations, tenants, users and clinical config all bootstrap themselves (~60s).
8. **context file** — description, every comment, and any previous run of this ticket. The session
   gets this as a file and has no Jira access at all.
9. **unattended session** — validates: positive case, negative case, and a red check it must have
   actually seen fail. Heartbeat every 5 minutes with elapsed time and app request count.
10. **capture the app log** before teardown, because container logs die with the container
11. **gate** — see below
12. **teardown** — environment and worktree removed

## The gate

The session recommends; the gate decides. It refuses unless *all* of:

- verdict is `deploy-ready`
- all three evidence fields present and substantial
- `red_check_signature` actually appears in the captured application log — the one claim that is
  mechanically checkable, so the central one is not taken on trust
- freshness re-verified here, not read from the session's own file
- ticket still in Ready for Testing or Testing
- status and comment count unchanged since pickup

That last one is the real boundary. The session runs with full user authority and could write to Jira
outside the pipeline; what it cannot do is hide having done so.

On admission: comment posted (plain text — the v2 API does not render markdown), then transition to
Done. Comment first, so a closed ticket is never left unexplained.

## After the session

Three things happen before the gate runs:

- the application log is captured out of the container, because container logs die with the container
  and the gate needs it to verify the red check
- `~/dev/orci` is checked for uncommitted changes, and the remote for a branch referencing the
  ticket. A validation session should touch neither; both warn to the log and to Slack rather than
  failing the run, since a dirty primary checkout is as likely to be yours as the session's
- every log line is ticket-prefixed, so `grep OR-2743 log/runner.log` reads as one ticket's story
  even when a parallel sweep interleaved it

## Outcomes

| disposition | meaning | action |
|---|---|---|
| `admitted` | closed, evidence held | none |
| `admitted_with_caveats` | closed, but the session flagged a caveat as material to shipping | read it |
| `reserved` | validated, Jira untouched | hand to its reviewer |
| `refused` | evidence did not hold, or verdict was inconclusive | `unblock.sh` |

A ticket with no runtime surface — CI workflow, deploy script, analytics SQL published to a tool the
instance cannot reach — should come back `inconclusive` with a blocker saying what would actually be
needed. The prompt forbids inventing an app-level red check to satisfy the format; the gate would
refuse it anyway, and "not locally validatable" is the more useful answer.
| `no_merged_pr` | nothing merged to validate | check whether it shipped at all |
| `umbrella` | a parent with subtasks and no PR of its own | nothing — it is skip-listed automatically, and its children are offered separately. Reverse with `unblock.sh unskip` |
| `stale_build` | fix not in the built commit | usually transient; retry |
| `env_failed` / `session_timeout` | infrastructure, not the ticket | retry |

Anything other than `admitted` pushes to Slack (`#my-agents`) with its blockers. Successes stay
silent on purpose.

## Unblocking

`unblock.sh` walks each needs-you ticket and offers: answer the blockers in `$EDITOR` (posted as a
Jira comment), retry as-is, skip permanently, or send back to In Progress.

Answering is the interesting one. The comment *is* the channel — the next session reads every comment
through its context file, and `backlog.sh` re-offers any ticket whose comment count changed. So
replying both records the answer and re-queues the work.

## Layout

```
~/.claude/bin/            shared: jira.sh, worktree-create/teardown, freshness,
                          build-image, env-up/down, gate, notify
~/.claude/jira-watch/
  bin/                    backlog, runner, digest, unblock, reap, teardown, automation, watch
  prompts/validate.md     what the unattended session is told
  state/results/<TICKET>/ result.json, session.json, runner.json, app.log, context.md, history.jsonl
  state/skip              tickets deliberately out of the sweep
  log/                    runner.log (readable), sweep.log (build output)
~/.local/bin/loopcmd      front door
```

## Selectors

Two, deliberately different:

- `backlog.sh` — **level**: everything sitting in the column, oldest first. This is what sweeps use.
  Skips tickets on the skip list, with an existing worktree or branch, already admitted, or whose
  last run failed and nothing has changed since.
- `watch.sh` — **edge**: only tickets that *arrived* recently. Written for a future scheduled watcher;
  it misses anything that landed while nobody was looking, which is why sweeps use the backlog.

## Coverage — the point of the exercise

Every validation proposes tests in `automation.assessment` / `automation.proposed_tests`. The loop
never writes them; `automation.sh` is the backlog so they cannot evaporate when a ticket closes.

```
automation.sh                   open proposals, grouped by source ticket
automation.sh done OR-2743#1    mark one written
automation.sh decline ID "why"  drop one
automation.sh ticket OR-2743    draft a linked Jira ticket bundling them (--create to make it)
```

`loopcmd cover OR-XXXX` runs the whole coverage flow as one session with the `loop-cover` skill:
curate the proposals with you, create the linked automation ticket, cut a worktree, write only what
survived, run the tests and report real output, pass the gate, open a draft PR. After it merges,
`loopcmd teardown OR-XXXX` removes the worktree and closes the ticket out — it refuses unless a
merged PR actually references the key.

`automate-gate.sh <worktree>` is the safety property for a coverage branch: test paths only, nothing
disabled or skipped, no assertions removed from existing tests. Stricter than the validation gate,
because for test-writing the important properties are mechanically checkable.

## Not automated yet

- **Nothing runs on a schedule.** No launchd. A sweep happens because you start one.
- No automated tests are written — the session proposes them in `automation`, a human writes them.
- Sessions run serially. Environments are isolated so they could overlap; the constraint is laptop
  resources, not correctness.
- Sessions run as the invoking user with full authority. Containerised isolation is scoped, not built.
- Scheduling and container isolation are the two remaining gaps. Both are designed, neither started —
  the reasoning, the trade-offs and the open questions are in `PROPOSALS.md` next to this file.
