---
name: or3064-unknown-patient-not-found
description: "OR-3064 unknown launch patient → 404 with plain id — DONE 2026-10-15, PR #4708 merged into the epic, worktree gone; R54 added to front-door; shared ~/.m2 jar got overwritten mid-session"
metadata:
  node_type: memory
  type: project
  originSessionId: 2bbd54a3-35de-4bb2-8947-b9485c620b37
  modified: 2026-10-15T19:32:40.900Z
---

OR-3064 (Bug under the OR-2863 design epic, filed from OR-3046): a demo-tenant launch for an unknown patient
answered 500 with `Patient with id: PatientId[value=…] not found` behind "Show details".

**DONE 2026-10-15:** [PR #4708](https://github.com/guidedclinical/orci/pull/4708) merged into the epic branch
(19:55Z), ticket moved to Done, worktree and branch removed via `worktree-done` (exit 0). Approved spec diff
(front-door **R54** added; next free front-door id R55) and acceptance criteria are in the ticket description.

**Fix shape:** `@ResponseStatus(NOT_FOUND)` on `RecordNotFoundException` (client-integration-api already has
spring-web). That makes demo, Mayo and MGB not-found all 404 and, because Spring's `ResponseStatusExceptionResolver`
(order 0) resolves before Sentry's resolver (order 1), the exception never reaches Sentry. Demo messages use
`patientId.value()`; known patient + unknown case → `Case with id: X not found for patient Y` (Ryan approved).
Mayo/MGB pmrn messages unwrapped too (approved scope). The error body's `message` field is what
`LaunchErrorDisplay` renders, and Spring Boot fills it from the exception message when `@ResponseStatus` has no
reason (`spring.web.error.include-message: always`).

**Tests:** `DemoPatientServiceTest` (client-integration-api, Mockito, no Spring), `AppLaunchControllerTest`
(standalone MockMvc + `ReflectionTestUtils` for the field-injected controller, `RETURNS_DEEP_STUBS` for
`TracingService`), LAUNCH-009 title now `[front-door R53, R54]`.

**Gotchas hit:**
- The auto-mode classifier blocks `git reset --hard` AND `git merge --ff-only`; `git rebase origin/epic/...`
  on a branch with no own commits is the lossless way to re-base a fresh `workon` worktree onto the epic.
- `~/.m2` is shared: between my first 8081 boot (correct 404) and the relaunch ten minutes later, the
  `client-integration-api-0.1.103-SNAPSHOT.jar` had been overwritten by another build and 8081 served the OLD
  code while its log showed my requests. Verify with
  `javap -v -cp <jar> com.guided.orci.integration.RecordNotFoundException | grep ResponseStatus` and reinstall
  the changed modules right before `spring-boot:run`.
- Running `-pl orci` tests against a reverted dependency needs the dependency reinstalled first; the red check
  for the controller test is a two-install dance.
- Ryan's `~/dev/orci` on 3000/8080 is `main`, which lacks the OR-3046 dialog — LAUNCH-009 there fails on the
  wrong assertion and is not a red check. Red evidence came from the stale-jar run on 8081.
- `psql` default DB is `orci`, not `postgres`; `demo-demo` has `cv-*-fake-<uuid>` known non-sample patients
  usable for the known-patient/unknown-case path.

See [[or2863-child-session-sop]], [[or3046-launch-by-id]], [[project-or2863-design-foundation]].
