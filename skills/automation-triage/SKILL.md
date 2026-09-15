---
name: automation-triage
description: Diagnose a failed QA Suite CI run and get it fixed. Use when invoked as /automation-triage, when Ryan asks why the qa-suite run failed, what broke the automation, or to look at a red run, and when he pastes or refers to a QA Suite Slack notification. Works from the GitHub run itself and ends at a cause with a decision attached.
---

# QA suite triage

A run went red and Ryan wants the cause now. Work from the run in GitHub — it holds everything and
is always there. The Slack notification is a shortcut, not the source; read the section at the
bottom if Ryan hands you one.

## Triage

**1. Find the run.** If Ryan gave a run URL or id, use it. Otherwise:

```sh
gh run list --workflow qa-suite.yml --limit 8 \
  --json databaseId,conclusion,createdAt,headSha,event \
  --jq '.[] | "\(.databaseId)  \(.conclusion)  \(.createdAt[0:16])  \(.headSha[0:7])  \(.event)"'
```

`workflow_run` means it followed a deploy to dev; `workflow_dispatch` means someone ran it by hand,
possibly against a different `base_url` and a narrower suite.

**2. Get the real tally.** The tail summary is authoritative — `failed`, `flaky`, `skipped`,
`passed`:

```sh
gh run view <id> --log | grep -E '[0-9]+ (failed|flaky|passed|skipped)' | tail -5
```

`flaky` means it passed on retry and is not why the run is red. CI runs `retries: 1`, so anything
counted as failed failed twice. No summary at all means the run died before Playwright reported —
install, auth, or a timeout; read the step log rather than hunting for a test.

**Do not grep `--log-failed` for test IDs.** It returns the whole failed *step*, every passing line
included, so a naive grep reports the entire suite as failing. Anchor on `✘` lines or on the
`N failed` block above.

**3. Read the assertion, not the summary.** The `1)` block carries expected vs received:

```sh
gh run view <id> --log | grep -B2 -A20 'Error:.*expect'
```

**4. Is it new?** Compare against the previous run — this is the step that separates "today's merge
broke it" from "this has been red for weeks and nobody looked."

```sh
gh run view <previous-id> --log | grep -oE '✘ +[0-9]+ \[.*' | grep -oE '[A-Z]+-[0-9]{3}' | sort -u
```

Same IDs failing in both: the deployed commit is innocent, whatever the Slack range says. New ID:
the suspect range is worth reading.

**5. Only if it is new, find the suspect range.** The failing run's `headSha` against the last
green run's:

```sh
gh run list --workflow qa-suite.yml --status success --limit 1 \
  --json databaseId,createdAt,headSha --jq '.[0] | "\(.createdAt[0:10]) \(.headSha)"'
git log --oneline <last-green-sha>..<failing-sha>
```

Check the date first. A last-green weeks old means the range spans hundreds of commits and is
worthless — step 4 is the real answer in that case, and "the suite has been red since <date>" is
itself the finding worth reporting.

**6. Check for a cascade.** Projects chain through dependencies in `playwright.config.ts`:
`smoke-api → smoke-auth → smoke-data → smoke-launch → clinical-rules / app-features`, and
`integrations` / `security` depend on `smoke-auth`. One smoke failure skips everything downstream —
the tally shows a big `skipped` count and the fix is the smoke test, not the twenty tests that
never ran.

## Classify before fixing

Every QA-suite failure is one of these, and the fix differs completely. Name which one it is before
touching code.

- **Product regression.** The app changed and the test caught it. This is the suite doing its job —
  the fix is in product code, on a ticket, and the test stays as-is.
- **Drift in live data.** These tests run against dev, which reads live Epic TST data. When a value
  changes upstream, a correct test fails without anything having regressed. The fix is in the test,
  and the test must stay meaningful — loosen it to what the assertion is actually about, do not
  delete the assertion.
- **Environment.** A deploy half-rolled-out, a tenant off, a dependency down. Nothing to fix in the
  repo; confirm against the deploy run and re-dispatch. CI deploy failures often converge on their
  own — do not chase them.
- **Flake.** Already passed on retry and reported as `flaky`. Only worth fixing if it recurs; when
  it does, fix the wait, never add a bare timeout.

## Reproducing

From `qa-suite/`, targeting the same environment CI used:

```sh
npm run test:dev -- --project=<project> --grep "<ID>" --no-deps
```

`--no-deps` skips the smoke chain, which is what makes this fast. Drop it when the failure might be
a dependency problem. Use the `:local` variants for anything you want to iterate on against your own
build. Always the npm scripts, never raw `TEST_ENV=... npx playwright`.

Artifacts live 14 days on the run — `playwright-report` and `test-results`, the latter holding a
trace for each failure:

```sh
gh run download <id> -n test-results -D /tmp/qa-<id>
npx playwright show-trace /tmp/qa-<id>/<dir>/trace.zip
```

The dev app also serves the last uploaded report at
`https://guidedor-dev.guidedclinical.com/qa-suite-report`.

## Closing it out

Report the cause in one or two sentences — which test, what it expected, what it got, and which of
the four classes it is. Then say what you propose and let Ryan decide before writing anything.

If the fix is a code or test change it follows the normal ticket flow: a ticket first, a worktree,
a branch whose prefix matches the issue type, the test run locally, a draft PR. If there is no
ticket for it, propose one — a test that has been red for weeks with no ticket is the failure worth
naming, more than the assertion itself.

## If Ryan hands you the Slack message

Composed by `.github/scripts/qa-suite-slack-payload.mjs`, posted per run. It can save you steps 1-5,
with one line to distrust:

- **Failing (N): IDs** — read from `playwright-results.json`, so these are the real failures already
  deduped across retries. The most reliable line in the message; it replaces steps 2-3's tally.
- **Deployed commit / PR / Triggered by** — the commit under test and its deploy run, without
  looking them up.
- **Since last green run (`sha`) — N commit(s)** — **check the count before believing it.** The
  baseline is the last green run whenever that was, so after a long red stretch this is a range of
  hundreds of commits presented as a suspect list. Step 4 supersedes it.
- **no results file — the run ended before reporting** — the run died before Playwright wrote
  results. Go to the step log.

Nothing here is unavailable from the run itself, so a missing or stale Slack message never blocks
the triage.
