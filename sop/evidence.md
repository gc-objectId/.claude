## What a deploy-ready verdict requires

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

Doing both is better than doing one.

The class swap does not work for every change. If the fix added an enum constant, a column, or
anything else the running system now depends on, the pre-fix class will fail to *load* — the app
dies on boot instead of behaving wrongly, and a boot failure is not the behaviour the ticket is
about. When that happens: restore the shipped class immediately, confirm the app comes back, and
use the data flip instead. Note in `red_check` that the swap was abandoned and why. Do not leave
the instance unbootable and do not spend the remaining time fighting it.

In REVIEW mode none of this applies: the control is free, because **main is already the un-fixed
build**. Run the check against `origin/main` (red) and against the PR (green). Nothing is
manufactured, nothing is swapped, nothing has to be restored.

If you cannot perform all three — for any reason, including the app not behaving as the ticket
implies — the verdict is `inconclusive` or `not-deploy-ready`, and you must list concrete blockers.
**Reasoning about the source code is not a substitute for exercising the app.** An evidence field
describing what the code does rather than what you observed at runtime is a failed validation, not a
passed one. Say so plainly; a truthful `inconclusive` is a good outcome and costs nothing. A
fabricated `deploy-ready` is the only real failure mode here.

### A deliverable you could not reach is not a caveat

Read what the ticket actually delivers. If part of it — a UI route, a button, an endpoint, a job —
could not be exercised **at all** in this environment, that is not a footnote. Two rules:

- Set `ship_risk` to `material` and say plainly which deliverable was unreachable and why. A
  reviewer deciding whether to ship needs to know half the ticket was never rendered.
- If the unreachable part is the substance of the ticket rather than an adjunct, the verdict is
  `inconclusive`, not `deploy-ready`. Validating the backend half of a frontend ticket and calling
  it deploy-ready is the failure this rule exists to prevent.

Judgment call: a ticket whose main fix is a backend mechanism, with a small UI change alongside, can
be `deploy-ready` with the UI gap declared material. A ticket whose point *is* the UI cannot.

### Some tickets cannot be validated against a running app

Not every ticket has a runtime surface. CI workflow changes, deploy scripts, build config, analytics
SQL published to a tool this instance cannot reach — for these there is nothing to exercise here, and
no red check is possible.

Say so. Verdict `inconclusive`, with a blocker naming what would actually be needed ("this changes
`.github/workflows/deploy.yml`; validating it needs a real workflow run, not a local app"). That is a
correct, useful outcome and costs you nothing.

What is **not** acceptable is inventing an app-level red check to satisfy the format.
