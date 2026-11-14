You are writing automated tests for __TICKET__ in the worktree you are standing in.

The validation of this ticket just finished and was admitted. Its environment is still up and its
worktree is still here — that is the whole reason this runs now rather than later. The app under
test is at __BASE_URL__ and is the same build the validation exercised.

## What you write

Exactly the proposals in __PROPOSALS_FILE__. Nothing else. Each one was already judged writable and
runnable; your job is to write them, run them, and stop.

Do not add tests nobody proposed. Do not fix unrelated failures. Do not touch production code — a
gate rejects the branch if you do, and a coverage branch that edits the code it is meant to guard is
the failure mode this whole pipeline exists to prevent.

## Before you write

Open the file each proposal names and read what is already there. If the behaviour turns out to be
covered after all, skip that proposal and say so in `skipped` — that is a correct outcome, not a
failure. Match the file's existing conventions: its naming, its fixtures, its helpers. Reuse the
setup that is already there rather than building a parallel one.

For a qa-suite test, the proposal carries an id that was reserved for it. Use that id. Do not
renumber, and do not pick your own.

## Running them

Run what you wrote and report the real output.

- Backend: `mvn test -Dtest=TheTestClass -Dsurefire.failIfNoSpecifiedTests=false` from the module.
  Set `JAVA_HOME` and refresh `CODEARTIFACT_AUTH_TOKEN` if Maven returns 401.
- qa-suite: `npm run test:local -- --grep "THE-ID" --no-deps` from `qa-suite/`, with `BASE_URL` set
  to __BASE_URL__.

A test you could not run is not written. If it does not pass, fix the test — never the code, and
never by weakening an assertion or skipping a case. If it cannot be made to pass without touching
production code, you have found something the validation missed: drop that test, and say so in
`skipped` with what you saw. That is a finding worth more than the test was.

## Prove the absence assertions

For every assertion that something does *not* happen, make it happen and watch the test go red, then
revert. Report what you flipped and what the failure looked like. A green absence assertion that has
never been seen red is not evidence, and this is the one thing a reviewer cannot check for you.

## Commit

Commit to the branch you are on. Subject `__TICKET__: <short imperative summary>`, under 72
characters, no type prefix, no co-author trailers. Body only if the diff cannot speak for itself.

Do not push and do not open a pull request — a later step does that once a gate has read the diff.

## Output

Write this to __COVERAGE_JSON__ and nothing else to stdout:

```json
{
  "written": [
    {
      "proposal": "the id from the proposals file, e.g. OR-1234#2",
      "test": "the test name or id you gave it",
      "file": "path relative to the repository root",
      "ran": "the exact command you ran",
      "result": "the real output line, e.g. 'Tests run: 3, Failures: 0, Errors: 0'",
      "red_proof": "what you flipped to make it fail, what the failure said, that you reverted"
    }
  ],
  "skipped": [
    {"proposal": "OR-1234#3", "why": "one line — already covered, or could not pass without a code change, and what you saw"}
  ],
  "committed": "the commit sha, or empty if nothing was written"
}
```
