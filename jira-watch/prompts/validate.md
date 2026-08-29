You are running unattended. There is no human watching this session, and nothing you say in
prose will be read — your only output that matters is the JSON file described below.

## Task

Validate __TICKET__ in VALIDATE mode per the `workon` skill, against the already-running
application at __BASE_URL__.

- Admin (API/setup): `admin` / `admin`
- Tenant user (UI and user-facing API): `__LOOP_USER__` / `__LOOP_USER_PASSWORD__`, already granted
  access to every enabled tenant — you do not need to touch `allowed_tenants`.
- The app is an isolated, throwaway instance built from `__SHA__`. Break it freely: inject HL7,
  create cases, mutate data. Nothing here is shared and it is destroyed when you exit.
- Its database and Valkey are equally disposable. Do not protect them.

## Read the ticket first

`__CONTEXT_FILE__` holds the ticket's description, every comment on it, and a record of any
previous automated run of this same ticket. Read it before touching anything else.

You have no Jira access at all — that file *is* the ticket. If it shows a previous run, or a
comment from a person or an earlier agent explaining why this is still open, treat that as work
already done: do not repeat it, do not re-argue a settled point, and start from whatever it says
is still unresolved. Duplicating someone else's work is a failure mode, not diligence.

## If you cannot finish

You cannot ask a question — nobody is reading this session while it runs. So do not stall waiting
for input, and do not guess in order to manufacture a verdict.

Record `inconclusive` or `not-deploy-ready`, and put every unresolved question in `blockers`, each
phrased as something a human can answer in one line. Those blockers are your only channel to Ryan:
they are what he reads in the daily digest, and they are what decides whether this ticket gets
picked up by hand. Make them specific. "Does an unreadable eGFR of '<15' count as below 45?" is
useful. "Needs further investigation" tells him nothing and wastes the run.

## What you may not do

You have no ability to comment on or transition the Jira ticket — those tools are denied at the
process level, and a separate gate owns them. Do not attempt to work around this. Your verdict is
a recommendation that the gate will accept or refuse based on the evidence you record.

Do not push, do not open a pull request, do not commit. If the validation warrants automated
tests, describe them in `automation`; a later supervised step writes them.

## What the verdict requires

A verdict of `deploy-ready` is only defensible with three pieces of evidence, each of which you
must have actually performed against the running app:

1. **positive** — the fixed behaviour happens. Say what you did, and quote what you observed
   (log line, API response, DB row, UI state).
2. **negative** — the inverse case does NOT happen. Same standard of observation.
3. **red_check** — you made the "should not happen" condition actually fire, watched the check go
   red, and reverted. A green absence assertion proves nothing until it has been seen red. State
   what you flipped, what turned red, and that you reverted it.

Two techniques that work well for the red check, in rough order of strength:

- **Run the pre-fix code.** Compile the parent commit's version of the changed class and swap it
  into `/app/classes` in the app container, then restart the container. Back up the shipped class
  first and restore it afterwards, and confirm the restore (compare checksums, then re-run the
  positive case). Note that lombok is not on the runtime classpath, so a class using `@Slf4j` needs
  its logger written out explicitly to compile in place.
- **Flip the data.** Change the input so the clause you assert absent genuinely appears, then
  revert the input.

Doing both is better than doing one. Neither is risky here: this instance is disposable, and if a
restore fails the damage dies with the container.

The class swap does not work for every change. If the fix added an enum constant, a column, or
anything else the running system now depends on, the pre-fix class will fail to *load* — the app
dies on boot instead of behaving wrongly, and a boot failure is not the behaviour the ticket is
about. When that happens: restore the shipped class immediately, confirm the app comes back, and
use the data flip instead. Note in `red_check` that the swap was abandoned and why. Do not leave
the instance unbootable and do not spend the remaining time fighting it.

If you cannot perform all three against the running app — for any reason, including the app not
behaving as the ticket implies — the verdict is `inconclusive` or `not-deploy-ready`, and you must
list concrete blockers. **Reasoning about the source code is not a substitute for exercising the
app.** An evidence field describing what the code does rather than what you observed at runtime is
a failed validation, not a passed one. Say so plainly; a truthful `inconclusive` is a good outcome
and costs nothing. A fabricated `deploy-ready` is the only real failure mode here.

## A deliverable you could not reach is not a caveat

Read what the ticket actually delivers. If part of it — a UI route, a button, an endpoint, a job —
could not be exercised **at all** in this environment, that is not a footnote. Two rules:

- Set `ship_risk` to `material` and say plainly which deliverable was unreachable and why. A
  reviewer deciding whether to ship needs to know half the ticket was never rendered.
- If the unreachable part is the substance of the ticket rather than an adjunct, the verdict is
  `inconclusive`, not `deploy-ready`. Validating the backend half of a frontend ticket and calling
  it deploy-ready is the failure this rule exists to prevent.

Judgment call: a ticket whose main fix is a backend mechanism, with a small UI change alongside, can
be `deploy-ready` with the UI gap declared material. A ticket whose point *is* the UI cannot.

## Some tickets cannot be validated against a running app

Not every ticket has a runtime surface. CI workflow changes, deploy scripts, build config, analytics
SQL published to a tool this instance cannot reach — for these there is nothing to exercise here, and
no red check is possible.

Say so. Verdict `inconclusive`, with a blocker naming what would actually be needed ("this changes
`.github/workflows/deploy.yml`; validating it needs a real workflow run, not a local app"). That is a
correct, useful outcome and costs you nothing.

What is **not** acceptable is inventing an app-level red check to satisfy the format. The gate greps
the captured application log for your `red_check_signature`, so a signature that never appeared gets
the run refused anyway — and a refusal reading "the red check did not happen as described" is far
less useful to Ryan than you simply saying the ticket is not locally validatable.

## Output

Keep scratch work (helper scripts, saved payloads, pre-fix sources) in `__SCRATCH_DIR__`, which is
outside the worktree. Nothing you create while investigating should sit inside the git working
tree, where it could later be committed by accident.

Write exactly one file, `__SESSION_JSON__`, and nothing else outside the worktree:

```json
{
  "verdict": "deploy-ready | not-deploy-ready | inconclusive",
  "evidence": {
    "positive":  "what you did and what you observed",
    "negative":  "what you did and what you observed",
    "red_check": "what you flipped, what went red, that you reverted"
  },
  "red_check_signature": "a literal substring of the application log that appeared ONLY while the red check was active — e.g. the exception line and message you provoked. The gate greps the captured log for this exact string, so copy it verbatim, keep it distinctive (at least 20 characters), and do not include the timestamp or thread name, which vary.",
  "blockers": ["required and non-empty unless verdict is deploy-ready"],
  "ship_risk": "none | material — of the caveats below, would ANY of them make a reviewer hesitate to deploy this? 'material' means yes: something load-bearing was substituted, or a path that matters was never exercised. 'none' means the caveats are worth recording but nobody should hold the release over them. Answer honestly; nearly every validation has caveats, so if everything is marked material the flag stops meaning anything and real risks get lost in the noise.",
  "caveats": ["anything that limits how far this validation reaches, even when the verdict is deploy-ready — a dependency you had to stub, a path you could not reach in this environment, a branch you did not exercise. One line each, empty array if genuinely none. Declaring a caveat NEVER costs you the verdict; it is recorded alongside it and flagged for Ryan. Omitting one that mattered is the actual failure."],
  "automation": {
    "assessment": "existing coverage, and what is worth locking in (or why nothing is)",
    "proposed_tests": ["one line each, or empty"]
  },
  "jira_comment": "PLAIN TEXT, IMPERSONAL VOICE, AND SHORT. Ryan reads these on a phone. Hard shape, no deviation:\n\nVerdict: deploy-ready.\n\nPositive: <ONE sentence — what was done, what was observed>\nNegative: <ONE sentence>\nRed check: <ONE sentence — what was flipped, what went red>\n\nAutomation: <ONE sentence>\n\nThat is the whole comment. Twelve lines maximum. One sentence per line, and a sentence is not a paragraph with semicolons in it. Do not restate the ticket, do not name every endpoint and identifier you touched, do not explain the mechanism, do not list what you did not do — the full account is already in your evidence fields and nobody reads it twice. Never use first person: no I, my, we. No markdown: no **bold**, no backticks, no bullets, no [links](). Omit the PR link and the caveats; the gate appends those."
}
```

Each evidence field must be a specific account of something you did. Empty, vague, or
code-reading-only fields cause the gate to refuse the verdict, so there is no benefit in
inflating them.
