---
name: or3076-event-center-case-start
description: "OR-3076 Event Center starts an unstored case again — DONE 2026-10-16, PR #4717 merged into the epic (c4de33349), worktree gone; event-center next free id R25; PatientId(null) wrapper trap"
metadata:
  node_type: memory
  type: project
  originSessionId: 3c974462-3344-40e3-9759-18dc17c2a135
  modified: 2026-10-16T16:19:37.686Z
---

OR-3076 (Bug under the OR-2863 design epic): the OR-3050 unknown-case guard in the admin category-event endpoint
also refused START_MONITORING, which is how a case GuidedOR never stored gets created (feed and Event Center).

**DONE 2026-10-16:** [PR #4717](https://github.com/guidedclinical/orci/pull/4717) merged into the epic (merge
c4de33349), `worktree-done` exit 0, ticket moved to Done. Approved spec diff (event-center R17/R20 changed, R23/R24
added; **next free event-center id R25**) is in the ticket's Acceptance criteria. The epic session still needs to pull.

**Non-obvious:**
- `new PatientId(null)` is NOT null: a blank PMRN wrapped that way skipped MGB's "no PMRN → read it from the surgical
  record" branch and sent the websocket event to a `PatientId[null]` topic (R19 silently false). The feed passes a real
  null; the controller now does too (`StringUtils.hasText` → null).
- Unknown-patient case start already surfaces as 404: EventService defers the case-start failure past the timing
  writes (update-by-caseId no-ops on an unstored case) and rethrows the `@ResponseStatus(NOT_FOUND)` exception.
- Known gaps left unfixed: Mayo unknown case and MGB no-PMRN unknown case answer a generic 500; a request with no
  `eventCategories` now 500s (NPE in `hasCategory`) where an unknown case used to 404.
- Classifier: `git reset --hard` blocked, `git merge --ff-only origin/epic/...` allowed this time, `git rebase` allowed.
- The epic moved mid-session (OR-3003, OR-3079 merged); a `;`-chained ancestor check let a stale push through. Gate
  push with `git merge-base --is-ancestor origin/epic/... HEAD &&`.
- Real-app recipe: branch backend on 8081 (`SPRING_PROFILES_ACTIVE=local ./mvnw -pl orci spring-boot:run`,
  `-Dserver.port=8081 -Duser.timezone=UTC`, ~42s), node script logs in as admin and POSTs category-event with
  `X-Tenant-Id: demo-demo`; assert in `"demo-demo".operations` / `operation_events`. FDB screening ERROR in the log
  during a demo sheet load is environmental.

See [[or2863-child-session-sop]], [[project-or3050-event-center-unknown-case]], [[or3064-unknown-patient-not-found]].
