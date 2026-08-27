---
name: project-jira-watch-autovalidate
description: "jira-watch — the validation loop that is now the default SOP for Ready-for-Testing tickets: architecture, the gate's trust model, hard-won facts, and what is still unbuilt"
metadata:
  node_type: memory
  type: project
---

`~/.claude/jira-watch/` validates Ready-for-Testing tickets unattended against a throwaway build of `main` and closes the ones whose evidence holds up. **This is the default path now** — see the "Validation Loop (jira-watch)" section of global CLAUDE.md. `loopcmd help` is the user-facing reference; `~/.claude/jira-watch/README.md` is the detail. Track record: 20 tickets, 12 closed, every refusal correct.

**The shape: shell does the mechanical, sessions do the judgment, skills hold the SOP.** `loopcmd 8 2` runs the autonomous half. `loopcmd review` gathers a briefing and hands off to an interactive session running the `loop-review` skill. `loopcmd session OR-XXXX` opens a session focused on one validation. Ryan asked for this structure explicitly and it is the right one — shell prompt loops cannot discuss.

**Trust model — the session recommends, the gate decides.** An LLM's self-report is not a control, so `gate.sh` owns every Jira write and refuses unless: verdict is `deploy-ready`; all three evidence fields are substantial; `red_check_signature` **actually appears** in the runner-captured app log; freshness re-verifies independently; the ticket is still Ready for Testing/Testing; and status + comment count are unchanged since pickup. That last check is the real boundary — `--disallowed-tools` proved unenforceable (the session routed around a denied read tool), and the session runs with Ryan's full authority anyway. It cannot hide a write, only make one.

**Risk model, unresolved:** an unattended session runs as Ryan with his keychain, so it could push, hit prod APIs, or read any credential. The prompt forbids it and the gate catches Jira tampering; nothing prevents the general case. Containerised isolation is scoped, not built — the cheap win is that a container gets default-deny for free, since the keychain is simply unreachable and the runner can pre-dump the PR diff so no GitHub token is needed either.

**Hard-won facts:**
- `POST /rest/api/3/search` is **410 Gone**; use `/rest/api/3/search/jql`, paginated via `nextPageToken`. `project = OR` must be **quoted** — bare `OR` is a JQL keyword.
- `status CHANGED TO` alone also matches tickets that already left the column; AND the current status too.
- `gh pr list --search` over-matches. Require the key in the PR title or a `Fixes|Closes|Resolves` line; otherwise sibling and ancient PRs both match.
- Jira comments post via **v2** (v3 demands ADF), so markdown does not render — plain text only, bare URLs. Descriptions and comment bodies also come back as plain strings from v2, which is why `jira_issue_context` uses it.
- Transitions resolve by target status **name**, not id: available transitions depend on current status.
- Compose project names must be **lowercase**; ticket keys are not.
- Readiness is the `Started OrciApplication in` log line, never `/actuator/health` — that is behind Spring Security (403), and Tomcat serves before `ApplicationRunner` finishes importing clinical config.
- Lombok is **not** on the runtime classpath, so in-container recompiles need `@Slf4j` written out.
- `compose exec` attaches stdin even with `-T`; without `</dev/null` a background sweep suspends with SIGTTIN. Same for `claude -p`.
- `date -j -f` parses a `Z` timestamp as **local** unless given `-u`; the offset alone exceeded the stale-run threshold and made every live run look stale.
- macOS `sleep` freezes with the system, so session timeouts count awake seconds — which is the behaviour you want.
- No executable jar exists (`spring-boot-maven-plugin` only runs `build-info`); the app ships as a Jib image. Use `jib:dockerBuild`, never `jib:build`, which pushes.
- A blank Postgres is fully usable: the app creates schemas per enabled tenant, migrates them, seeds tenant rows and users, and imports bundled clinical config, all on boot. `local,docker` profile order is deliberate — docker last so its datasource wins, local supplies tenant enablement.

**Design decisions worth not relitigating:**
- **Freshness before pickup.** Nothing touches the board until there is a merged fix in the built commit; otherwise tickets got moved and assigned for runs that then aborted.
- **`ship_risk`, not caveats, drives the flag.** Caveats are near-universal (5/5 in one sweep), so flagging on their presence destroyed the signal. The session states whether any caveat should make a reviewer hesitate; only `material` produces `admitted_with_caveats`. Caveats are still always posted. Never refuse *because* of a declared caveat — that teaches concealment.
- **Reserved tickets** (`LOOP_RESERVED_PATTERN`, default `^Analytics:`) validate fully and drop every Jira write, because Alex validates that work. Proven in practice: OR-2603/OR-2755 stayed hers, untouched.
- **Impersonal comment voice** for autonomous runs; interactive `/workon` keeps first person. The comment posts under Ryan's account.
- **Only test paths may change on a coverage branch.** `automate-gate.sh` refuses production edits, added `@Disabled`/`.skip`, and any removed assertion — the mechanical form of Ryan's hard stops.
- **Serial by default.** Environments are isolated so 2-way works and was measured at 8 tickets in ~45min; the ceiling is Docker's 7.8GB VM (tmpfs Postgres is RAM), so 2 is safe, 3 is the edge.

**The recurring lesson, in every layer:** absence of failure is not evidence. `notify.sh` reported "sent" for hours through a 302; my own verification loop reported "0 first-person" on empty strings because zsh does not word-split; a stale shell reported teardown success while its verify helper never ran. Every one was caught by checking the world rather than the script's own report — which is exactly why the gate re-runs freshness, why the red check must be *seen* red, and why Slack delivery is confirmed from the Slack side.

**The SOP maps to verbs end to end** (2026-08-26): validate+close `loopcmd 8 2`; review/unblock `loopcmd review`; discuss+implement coverage `loopcmd cover OR-XXXX` (session + `loop-cover` skill: curate, create the linked automation ticket, worktree, write only the keeps, run them, `automate-gate.sh`, draft PR); feedback stays Ryan's on the PR; `loopcmd teardown OR-XXXX` after merge (refuses unless a merged PR references the key). Two skills hold the SOP: `loop-review` and `loop-cover`.

**The two unbuilt things are designed and written up in `~/.claude/jira-watch/PROPOSALS.md`** — read that before re-deriving either. It covers, for container isolation: why default-deny comes free (a container cannot reach the keychain, so Jira/AWS/GitHub die from credential absence), the exact list of what must be granted, the docker-socket problem and the mediated-helper answer (two whitelisted verbs, `swap-class` and `restart-app`, rather than socket access), and what it still would not solve. And for scheduling: that the real question is overnight-batch versus continuous polling rather than how, that `reap.sh` must run before each scheduled sweep or a sleep-interrupted run strands a ticket forever, and that launchd needs PATH set explicitly. Referenced from `loopcmd help` and the README.

**Not built:** scheduling (no launchd; `dispatch.sh` and the plists were classifier-blocked, and Ryan launching sweeps is the correct boundary for a daemon anyway) and container isolation. On the sandbox: Ryan rightly questioned the emphasis — the loop is the same tool he already runs interactively with broad permissions, and the controls that bound damage already exist (disposable env, `gate.sh` for Jira, `automate-gate.sh` for code). The delta is *supervision*, which only matters at scheduled high volume. Cheaper control to build first: have the runner assert `~/dev/orci` is clean and no unexpected branch was pushed after each session.

**Two bugs a real review found (2026-08-26), both fixed:**
- `digest.sh` and `unblock.sh` ignored `state/skip`, so a handled ticket kept reappearing under NEEDS YOU until its `result.json` was deleted. Both now filter it and the digest lists skip-listed tickets separately instead of hiding them.
- **The reserved guard nearly failed open.** `LOOP_RESERVED_PATTERN` was `^Analytics:` *with a colon*, so "Analytics investigation - ..." (OR-2775) was treated as write-enabled; it only stayed safe by bailing at `no_merged_pr` before reaching the gate. Alex's work was one loosely-worded summary from an autonomous Jira write. Fixed two ways: the pattern is now `^analytics` matched case-insensitively, **and** a ticket assigned to anyone other than `JIRA_ACCOUNT_ID` is reserved regardless of its title. Assignment is the strong signal a title heuristic only approximates; unassigned stays fair game, since most of the column is. Lesson: a guard keyed on how humans phrase things is a guard waiting to miss.

**Subtasks are invisible to `sprint in openSprints()`** (found 2026-08-26, fixed). A subtask displays its parent's sprint in the UI — OR-2800 reads "OR Sprint 90 (active)" and its sprint field is populated — but JQL does not treat it as a sprint member, so it never matches. Consequence: OR-2799's five merged subtasks (OR-2800..2804, the pathway rewrite blocking Mayo go-live, ~40 reviewed test cases) were unreachable, while the umbrella OR-2799 burned a sweep slot returning `no_merged_pr` every time. Dropping the sprint predicate is the wrong fix — it takes the column from 16 to 35 by dragging in ~19 tickets parked since 2025. `backlog.sh` now runs a second query, `parent in (<keys from the first query>)`, so subtasks arrive via a parent already known to be in an open sprint. Verified: all five appear, no pre-2026 ticket does. General lesson: an umbrella ticket will always hand back `no_merged_pr`; skip-list it and let the loop reach its children.

**Round of fixes 2026-08-26 (late):**
- **Post-run repo-clean assertion** (the cheap alternative to container isolation): after each session the runner checks `~/dev/orci` is clean and that no remote branch references the ticket, warning to the log and Slack if either fails. Detection, not prevention, but it catches the realistic failure — a confused session writing in the wrong directory or pushing when told not to.
- **`runner.log` lines are now ticket-prefixed** (`14:23:20  [OR-2743] …`), because a parallel sweep interleaves and `grep OR-2743 runner.log` should be one ticket's whole story.
- **`loopcmd applog` follows every live environment**, not just the first, tagging each line with the run id and dropping followers as their containers go. Under a 2-way sweep it was hiding half the work.
- **Prompt: tickets with no runtime surface.** CI workflows, deploy scripts, analytics SQL — nothing to exercise locally, no red check possible. The session must return `inconclusive` naming what would actually be needed, and must **not** invent an app-level red check to satisfy the format. OR-2691 did exactly that and the gate refused it; "not locally validatable" is a far more useful answer than a refusal.
- **`loop-review` no longer curates coverage.** Its description and actions table invited it to work the automation backlog, so review sessions drifted into coverage work — that was a prompt bug of mine, not the session overstepping. Review now reports the backlog count and hands off to `loopcmd cover`, which has its own skill and deserves its own sitting.
- **`dispatch.sh` was never created** (classifier-blocked twice) and is not needed: `loopcmd sweep` with `xargs -P` covers it. Removed the stale README reference.
