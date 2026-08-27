# jira-watch — designed but not built

Two things the loop is missing, written down while the reasoning is fresh. Neither is started.
Referenced from `loopcmd help` and the README so they surface when the loop comes up.

---

## 1. Container isolation for validation sessions

### The problem

A validation session runs `claude -p --permission-mode bypassPermissions` as Ryan, with his keychain,
his `gh` credentials, and his AWS config all reachable. Nothing prevents it pushing a branch, calling
a prod API, or reading any secret on the machine. The prompt forbids it; the gate catches Jira
tampering; `automate-gate.sh` catches production edits on a coverage branch. The general case is
uncovered.

**This is deliberately not urgent.** It is the same tool Ryan already runs interactively with broad
permissions, and the controls that bound the damage exist: destructive work targets a *disposable*
container, and both gates are mechanical. Across ~20 tickets the observed behaviour was careful —
repo clean every time, edits container-scoped, caveats disclosed honestly. The delta is
**supervision**, and it only bites at scheduled high volume: 25 unattended sessions a night is 25
chances for an unsupervised mistake discovered the next morning.

The cheap mitigation is already built: after each session the runner asserts `~/dev/orci` is clean
and that no branch was pushed for the ticket, warning to Slack. Detection, not prevention.

### Why a container is cheaper than it sounds

The valuable property comes free: **a container cannot reach the macOS keychain**, and `~/.aws`,
`~/.ssh`, and the rest of `$HOME` are simply not mounted. So Jira writes, AWS calls, and GitHub
pushes all die from *credential absence* rather than needing egress rules or policy. Default-deny is
the starting state, and the work is additive.

What must be granted, and only that:

| Need | How |
|---|---|
| The app under test | join the run's compose network; reach it as `orci:8080`, not a host port |
| Postgres / Valkey | same network, by service name; `psql` in the image |
| The worktree | bind-mount read-write (it writes tests) |
| Anthropic API | mount only the credentials file, or a dedicated key |
| The merged PR diff | **no GitHub token** — the runner already resolves the PR, so it can dump the diff into the run directory |

### The hard part

The strongest evidence the loop produces is the class-swap red check: compile the parent commit's
class, `docker cp` it into `/app/classes`, restart, watch it go red, restore. That needs Docker
control, and mounting `docker.sock` is root on the host — it defeats the entire sandbox.

The answer is a **mediated helper**, not socket access: a small host-side listener on the run network
exposing exactly two verbs, `swap-class <file>` and `restart-app`, scoped to that run's containers.
The session asks; the host performs. Whitelisted verbs, no general Docker API.

Alternatives, both worse: mount the socket behind a filtering proxy (narrower, still an escape
surface), or drop the class swap and rely on data-flip red checks only (weaker evidence, and the
class swap is what made OR-2743 and OR-2755 convincing).

### What it still would not solve

The session can do anything it likes *inside* the sandbox and to the disposable app — which is fine,
both are throwaway. It can spend Anthropic quota. And it can send worktree contents to the Anthropic
API, which is inherent to using an LLM at all.

### Effort

The largest of the remaining work. Image (JDK 21 for in-container `javac`, node, psql, jq, git,
claude), the mediated helper, network wiring, and re-verifying that a red check still works from
inside. Worth doing **before** scheduling turns this loose unattended at volume — not before
continuing to run sweeps by hand.

---

## 2. Scheduling

### What it is

Two launchd plists: one to run a sweep on a cadence, one for an end-of-day digest. Small — the
prerequisite that worried me is already resolved (reserved tickets are no longer re-offered:
`backlog.sh` skips anything whose last run was `reserved` with nothing changed since).

### Blocked on

The auto-mode classifier refused to let Claude write `dispatch.sh` or the plists — a script whose
purpose is running unattended agents with write authority against real tickets is exactly what it
should hesitate on. Ryan either saves them by hand or grants a permission rule. Note that
`dispatch.sh` itself is **not needed**: `loopcmd sweep` with `xargs -P` already does bounded
parallelism.

### The real design question

Not *how* but *when*. Two shapes:

- **Overnight batch.** One sweep at, say, 01:00, `--limit 25 --concurrency 2`. No contention with
  Ryan's own work for the 7.8GB Docker VM, and the digest is waiting in the morning. Cost: a ticket
  landing at 09:00 waits sixteen hours.
- **Continuous polling.** `watch.sh` already exists for this — it is edge-triggered, matching only
  tickets that *arrived* recently, and was written for exactly this purpose. Gets near-immediate
  validation, but competes for the Docker VM and for Ryan's attention all day.

Overnight is the better first move. Continuous only makes sense once the loop has run unsupervised
enough times that its verdicts are boring.

### What to get right

- **Sleep.** `caffeinate -ims` must wrap the sweep, and the lid must stay open — closing it sleeps
  regardless. A sleeping laptop stalls rather than breaks a sweep, and the in-flight ticket usually
  comes back `refused` on wake.
- **Reaping.** A scheduled sweep interrupted by sleep or a crash strands a worktree, which then
  blocks that ticket forever via the "worktree exists" guard. `reap.sh` should run before each
  scheduled sweep, not just when Ryan remembers.
- **Volume.** 25 unattended sessions a night is where the isolation question above stops being
  hypothetical. Do them in that order.
- **PATH.** launchd gets a minimal environment. Needs `/usr/local/bin` (docker),
  `/opt/homebrew/bin` (mvn, gh), and `~/.local/bin` (claude) set explicitly in the plist.

### Effort

Small once the shape is chosen. The `reap.sh`-before-sweep wiring is the only new logic.
