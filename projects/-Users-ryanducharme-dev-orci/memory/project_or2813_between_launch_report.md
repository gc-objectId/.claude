---
name: project_or2813_between_launch_report
description: "OR-2813 BETWEEN-on-timestamps audit task — validated deploy-ready and moved to Done 2026-11-03; only the launch report was fixed (#4773), the two sites named in the ticket are window-membership checks and were left; no automation (tests PR #4810 withdrawn as framework-only); worktree gone"
metadata:
  node_type: memory
  type: project
  originSessionId: 8673b42e-99db-4c5d-b033-570575cd6457
  modified: 2026-11-03T15:09:24.584Z
---

OR-2813 (Task under the Postgres "Don't Do This" epic OR-2829): Theo's PR #4773 (merged 2026-11-03) replaced the launch report's `findByCreatedDateBetween` with a half-open `GreaterThanEqual/LessThan` range over the tenant's midnights (Central for Mayo, Eastern for MGB), binding the admin form's dates as `LocalDate`.

Validated 2026-11-03 by A/B: worktree build of main 45fccb1df on 8081 vs Ryan's pre-fix 8080 build (main f526d1b9e, Eastern JVM). Five seeded `mayo-mayo` launch events at the Sep/Oct/Nov boundaries; the pre-fix build dropped both Oct 31 events, counted Sep 30 23:59:59 Central as October, and labelled raw timestamps in Eastern. Moved to Done at that verdict.

Scope decision recorded in the Jira comment: the ticket names `CustomMedicationSelectionRepositoryImpl` (vasopressor/antihypertensive recency window ending at the evaluation instant) and `case_volume_detail.sql` (administrations inside a case's start/end). Both still use BETWEEN, but they are single-window membership checks, not adjacent partitions, so nothing double-counts or drops. Liquibase backfills 238/239 use the same pattern. If anyone reopens this, that is the argument to revisit.

Automation: none. The repository test in PR #4810 only exercised Spring Data's derived-query semantics against Postgres and Ryan dropped it on 2026-11-03; the merged service tests already pin the zone and the extra day. PR closed, branch and worktree removed.

Reusable mechanics: the launch report is scriptable with node (form login to `/api/login/basic`, XSRF cookie as header, form POST to `/api/admin/reporting/generate-launch-report`, parse the xlsx with openpyxl without `-I`). `@CreationTimestamp` ignores builder values, so repo tests force `created_date` with a native UPDATE then `flush/clear` (pattern from `HL7InboundMessageRepositoryTest`). See [[reference_run_worktree_app_second_port]] — with `-pl orci dependency:build-classpath` alone, sibling jars resolve to stale `~/.m2`; swap them for `<module>/target/*.jar` and `javap` the repository to confirm before booting.
