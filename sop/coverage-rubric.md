## Which proposed tests get written

`write_now` is a claim that the test can be written today, in this worktree, and that the build will
run it. Two hundred and fifty proposals were filed and three were ever written, because the bar was
"would a test here be nice" rather than "will this run and can it fail". Mark `write_now: false` and
say which bar it fails — a recorded refusal is worth more than a proposal nobody drains.

A test earns `write_now: true` only if all of these hold:

1. **The build runs it.** Surefire includes `**/*Test.java` and **excludes `**/*IntegrationTest.java`**.
   The exclusion is on the *name*, not the kind of test: most classes extending
   `AbstractIntegrationTest` / `AbstractCommittingIntegrationTest` are named `*Test` or `*SpecTest`
   and run in CI on every build, Testcontainers and all. So needing committed transactions, a real
   Postgres or `afterCommit` ordering is **not** a reason to defer — name the class `*Test`, extend
   the integration base, and it runs. Only a test proposed *into an existing* `*IntegrationTest`
   class has no runnable home. Prefer rehoming it to a `*Test` sibling over `write_now: false`; if
   it genuinely cannot move, say so in `why_not` and name the class.
2. **It is not already covered.** Read the diff that this ticket's own PR shipped — `git log -p` or
   `gh pr diff` — and look at its test files first. Coverage that arrived with the fix is the single
   most common reason a proposal is dead on arrival, and it is the one file you are guaranteed to
   have. Then open the class or spec you named and say in `assessment` what is there. "Probably
   covered somewhere" is not an assessment.
3. **It can fail.** An absence assertion ships with the control that makes it go red, in the same
   test. A test that asserts nothing happens, with nothing to prove it would have noticed, is noise.
4. **It asserts behaviour, not plumbing.** No asserting on log strings. No golden tables that force
   an edit for every new row — that trains blind updates. No third level of an assertion two
   siblings already make.
5. **It is a test file.** Not a workflow, not a pom, not application.yml, not a Liquibase changeset.
   Those are real work when they are needed, but they belong in a ticket, not a coverage branch.
6. **It is not a one-shot migration that has already run**, and not analytics SQL, which belongs to
   another reviewer.

For a qa-suite test, do **not** invent the `PREFIX-NNN` id. Run
`~/.claude/bin/test-id.sh next PREFIX <count>` and use what it hands back; two runs picking ids from
the repo alone both chose `LAMD-002`.

Name the file each test goes in before writing anything. Two tickets whose coverage lands in the same
test class produce two branches that insert at the same anchor and conflict on merge, so the file is
claimed: run `~/.claude/bin/test-file-claim.sh take <ticket> <path>` and treat a refusal as a
`write_now: false` naming the ticket that holds it.
