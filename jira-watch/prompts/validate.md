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

If you cannot perform all three against the running app — for any reason, including the app not
behaving as the ticket implies — the verdict is `inconclusive` or `not-deploy-ready`, and you must
list concrete blockers. **Reasoning about the source code is not a substitute for exercising the
app.** An evidence field describing what the code does rather than what you observed at runtime is
a failed validation, not a passed one. Say so plainly; a truthful `inconclusive` is a good outcome
and costs nothing. A fabricated `deploy-ready` is the only real failure mode here.

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
  "automation": {
    "assessment": "existing coverage, and what is worth locking in (or why nothing is)",
    "proposed_tests": ["one line each, or empty"]
  },
  "jira_comment": "PLAIN TEXT, ~10 lines, first person, in Claude's voice: verdict, how it was validated (positive/negative/red check, one line each), and the automation plan. Do not include the PR link; the gate inserts it. Use NO markdown whatsoever — no **bold**, no `backticks`, no *bullets*, no [links](...). The comment is posted through an API that does not render markdown, so any syntax shows up as literal punctuation. Structure it with plain prose, blank lines between paragraphs, and lines beginning with '- ' for lists."
}
```

Each evidence field must be a specific account of something you did. Empty, vague, or
code-reading-only fields cause the gate to refuse the verdict, so there is no benefit in
inflating them.
