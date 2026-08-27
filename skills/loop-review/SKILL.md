---
name: loop-review
description: Walk the jira-watch validation loop's review queue with Ryan — triage what the last sweep handed back and unblock the tickets that need a decision. Use when invoked as /loop-review, when `loopcmd review` launches a session, or when Ryan asks to go through the validation queue or the digest. Writing the proposed coverage is a separate sitting (loop-cover), not part of this one.
---

# Loop review

The sweep validates and closes tickets on its own. What it cannot do is decide. This is that
conversation — one ticket at a time, with Ryan.

A briefing has been generated at `~/.claude/jira-watch/state/review-briefing.md`. **Read it first.**
It holds the digest, the blockers for every ticket needing attention, stranded worktrees, and the
coverage backlog. Do not re-derive any of it by hand.

## How to run it

Work through the needs-you tickets **one at a time**, in the order the briefing lists them. For each:

1. State the ticket, its outcome, and what it is actually asking — in a sentence or two, not a recap
   of the briefing Ryan can already see.
2. Say what you think should happen and why. This is the point of the session: a recommendation, not
   a menu. Read `digest.sh <TICKET>` for the evidence if the briefing is not enough.
3. Get Ryan's call, then take the action. One ticket resolved before moving to the next.

Do not batch, do not summarise everything and ask at the end. He wants a queue walked.

## The actions

Use these rather than doing the equivalent by hand — they are the same mechanisms the shell flow
uses, and the loop reads their state:

| Intent | Command |
|---|---|
| Answer the blockers | `unblock.sh answer OR-XXXX "text"` — posts as a Jira comment |
| Retry unchanged | `unblock.sh retry OR-XXXX` |
| Never validate locally | `unblock.sh skip OR-XXXX` |
| Not actually implemented | `unblock.sh inprogress OR-XXXX` |
| Clear stranded worktrees | `reap.sh --apply` |
| Coverage backlog | report the count only — see below |

Scripts live in `~/.claude/jira-watch/bin/`.

**Answering blockers is the highest-value action.** The comment is the channel: the next session
reads every comment through its context file, and the backlog re-offers any ticket whose comment
count changed. So a good answer both records the decision and re-queues the work. Write answers that
a fresh session with no memory of this conversation could act on.

## Judgment worth applying

- A `refused` verdict of `inconclusive` is usually the system working. Read the blockers before
  assuming something broke.
- `no_merged_pr` means check GitHub yourself — either it never shipped, or its PR does not reference
  the key strongly enough for `freshness.sh` to match. Those need different responses.
- A ticket that is not locally validatable at all (CI config, infrastructure, another team's
  environment) should be skipped, not retried. Retrying it forever is the failure mode.
- `reserved` tickets belong to another reviewer. Offer Ryan the evidence to forward; never write to
  those tickets.
## The coverage backlog is not this job

The briefing includes it so Ryan can see the size of it. **Report the number and stop.** Do not
curate proposals, do not create automation tickets, do not start writing tests here.

If he wants to work it, the answer is `loopcmd cover OR-XXXX` — a separate session with the
`loop-cover` skill, because choosing what to write deserves its own sitting rather than being tacked
onto a triage pass. Offer that command and move on.

## Boundaries

- **Never start a sweep from this session.** If Ryan wants one, hand him `loopcmd 8 2`.
- Confirm before each Jira write. A batch of comments posted on his account without per-ticket
  agreement is exactly what the loop's gate exists to prevent.
- Do not edit the loop's scripts here. If something is broken, note it and move on.
