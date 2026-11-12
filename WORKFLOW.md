# How I work

The spec for my development loop: what the unit of work is, where work comes from, and which
tool drives it. `jira-watch/README.md` describes the loop's machinery; this describes the
process the loop exists to serve. Where they disagree, this file is the intent and the loop
is what has been built so far.

Status markers: **[built]** works today. **[gap]** is designed and agreed but not written.

## The shape

One idea holds the whole thing together:

> **`workon` is the unit of work. Everything else either selects work for it, or runs many of
> it at once.**

```
  source of work          work item              driver                 outcome
  ──────────────          ─────────              ──────                 ───────
  Jira column        →    {ticket, mode}    →    workon script          branch + worktree
  GitHub PR          →    {pr, ticket?,     →    + workon skill    →    + validation/code
  me, by hand             base ref, mode}        (the SOP)              + Jira/PR close-out
                                                      ↑
                                          the loop runs N of these
                                          unattended and gates the writes
```

The script makes a place to work. The skill is the SOP for working there. The loop is a batch
driver for when work stacks up — it is **not** a separate process, and nothing should be true
of the loop that is not true of a single `workon`.

That ordering is the design rule: **a capability lands in the script and the skill first, and
in the loop second.** If I can't do it by hand, the loop has no business doing it unattended.

## The three modes

Mode decides everything downstream: what gets built, what counts as evidence, which close-out
runs. It is derived, not asked for.

| Mode | When | App under test | Close-out |
|---|---|---|---|
| **IMPLEMENT** | ticket is To Do / In Progress | the branch build | draft PR; ticket stays In Progress until merge |
| **VALIDATE** | ticket is Ready for Testing / Testing | the **main** build (fix already merged) | comment + Done at the deploy-ready verdict |
| **REVIEW** **[gap]** | a PR is named | the **PR merged into main** | review verdict + coverage on a stacked PR; nothing merges |
| *EXPLORE* | issue type is Epic, any status | local only | nothing — epics are never implemented directly |

Derivation order **[gap, partly]**: **a PR argument wins.** `workon --pr 4813` is REVIEW even if
the linked ticket sits in To Do. Absent a PR, mode follows ticket status as it does today.

### Why REVIEW is worth having

Today validation happens *after* merge, so the automation I write is always late and the loop
has to **manufacture** the un-fixed control — compile the parent-commit class, swap it into
`/app/classes` — just to watch a check go red. That reconstruction is the most fragile step in
the whole run, and it was a named caveat on OR-3032.

Pre-merge, that control is free: **main is already the un-fixed build.** Run the check against
main (red), run it against the PR merged into main (green). Nothing to manufacture.

The base ref is `refs/pull/N/merge` — GitHub's precomputed merge of the PR into main, first
parent `origin/main`, second the PR head. It is exactly what Actions checks out for
`pull_request` events, so building it is byte-identical to what CI built.

And the automation lands *with* the fix, on a PR stacked on the author's branch, instead of
accruing as debt.

## Where work comes from

A **source** answers one question: what should I work on next? It emits work items; it does
not know how to do the work.

- **Jira column** **[built]** — everything sitting in Ready for Testing, oldest first. This is
  what sweeps use. Skips the skip list, anything with an existing worktree or branch, anything
  already admitted, and anything whose last run failed with nothing changed since.
- **A PR** **[gap]** — one PR by number, or open PRs awaiting my review.
- **Me, by hand** — the default and always available. `workon OR-1234 slug`.

Sources are pluggable **[gap]**; today the Jira column is hard-wired into `backlog.sh`.

### Claiming

Claiming exists to protect a **Jira write**, not to protect the work. VALIDATE writes to Jira,
so it claims: assign + move to Testing, and the gate later proves status and human comment
count are unchanged since pickup. REVIEW has no Jira write, so it needs no claim — the local
worktree/branch guard is enough, and it's just Theo and Jordan on the other end.

## The manual path

```sh
workon OR-3132 med-selection-baseline     # script: fetch, branch, worktree, assign, cd
claude                                    # then /workon
```

```sh
workon --pr 4813                          # [gap] worktree on refs/pull/4813/merge
claude                                    # then /workon → REVIEW
```

The script always bases on `origin/main` today **[built]**; `--pr` is the one line that has to
move **[gap]**. Branch prefix is derived from the Jira issue type (Bug→`bugfix/`, Epic→`epic/`,
Story/Task→`feature/`).

This path is correct for: all IMPLEMENT work, anything needing supervision, anything with a
blast radius, and any one-off. **The manual path is not a fallback — it's the default.** The
loop is for when things stack up.

## The batch path

```sh
loopcmd 8 2        # validate 8 tickets, 2 at a time, unattended
loopcmd review     # walk what came back, with me
loopcmd now OR-X   # jump the queue beside a running sweep
```

Everything the loop does unattended, a `workon` session does by hand. The difference is
**trust**: an unattended session recommends, and `gate.sh` decides.

The gate owns every Jira write and refuses unless the red-check signature actually appears in
the captured app log, freshness re-verifies independently of the session's claim, and the
ticket's status and human comment count are unchanged since pickup. A session cannot certify
its own work. That is the only reason unattended closing is acceptable at all.

Approval is always mine. The gate does not approve — it refuses; what it lets through is work
whose evidence is mechanically checkable.

## Coverage

**Coverage is the point. Validation closes tickets; coverage is what I keep.**

The loop proposed tests and parked them in a backlog, and in the entire time I used it I
covered exactly none — 190 open of 227 proposed. A queue nobody drains is worse than no queue,
because it looks like capture. The curation sitting was the thing that never happened, so the
fix cannot be a better curation prompt.

**The rule: coverage is written inside the run that proposed it, and reviewed as a PR.** **[gap]**

- The session marks each proposal `write_now` / `propose_only` / `not_automatable`. The bar for
  `write_now` is "I can write this and watch it pass *and* watch it fail, right now, against
  this environment."
- On admission, while the worktree and the bootstrapped environment are **still up** — the gate
  runs before teardown — a second session writes only the `write_now` set, runs it, reports
  real output, and passes `automate-gate.sh` (test paths only, nothing skipped or disabled, no
  assertions removed from existing tests).
- A draft PR opens on the validation worktree's existing branch. No second worktree, no linked
  automation ticket — the PR references the source key.
- `propose_only` goes to `automation.sh`, which now means "needs a human", not "everything".

My steering moves from a sitting I never take to a PR review I already do daily, where I'm
judging real code instead of a one-line proposal. Declining is closing a PR.

The environment is why this belongs in the run: at the moment of admission the app is up on a
known port with tenants, users and clinical config bootstrapped. `loopcmd cover` rebuilds all
of that from scratch, and that cost is a good part of why it never got run.

## The whole flow

```
  IMPLEMENT          workon OR-X slug → /workon → tests pass → draft PR → In Progress
                                                                   ↓
  REVIEW    [gap]    workon --pr N → /workon → red on main, green on merge-ref
                                             → coverage on a stacked PR → my verdict
                                                                   ↓
                                                            Theo/Jordan merge
                                                                   ↓
  VALIDATE           loopcmd 8 2 (or workon OR-X) → positive + negative + red check
                     → gate → comment + Done → coverage PR in the same run [gap]
                                                                   ↓
  TEARDOWN           merge → worktree-done (by hand) / loopcmd teardown OR-X (loop)
```

REVIEW is the new arm. Where it works, VALIDATE has less to do — the fix was already exercised
before it merged.

## Rules that outrank convenience

- **Absence of failure is not evidence.** Every "should not happen" check gets flipped until it
  goes red, then reverted. A green absence assertion means nothing until I've watched it fail.
  This applies to the guards in this machinery too, not just to product code.
- **The gate is the only thing that writes to Jira** in an unattended run, and it re-verifies
  rather than trusting.
- **Never let a session certify itself.**
- **Approval is mine.** Nothing merges unattended.
- **Analytics tickets are reserved** — validated in full, every Jira write dropped. Alex owns
  that review.
- **An unattended session never picks up implementation work.** The runner re-reads status and
  aborts outside Ready for Testing / Testing. IMPLEMENT stays manual, deliberately.
- **No automated schedule.** A sweep happens because I start one.

## Open

- **Does IMPLEMENT ever get a source?** Pointing a loop at To Do and letting it churn is the
  obvious extension and the one I trust least. Undecided.
- **`merged_elsewhere`** — comment only, or comment and close.
- **Epic-implementation mode** — designed for OR-2863, never built.
- **Container isolation and scheduling** — the two standing gaps in the loop. See
  `jira-watch/PROPOSALS.md`.
