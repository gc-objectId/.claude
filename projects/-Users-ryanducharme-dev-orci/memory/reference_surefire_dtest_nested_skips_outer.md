---
name: reference_surefire_dtest_nested_skips_outer
description: "-Dtest=ClassName silently runs only @Nested tests when a class has them, so a new outer-class test can report green without ever executing"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 595dbeed-ca2e-4364-ad19-8ac2b59a9b40
  modified: 2026-08-14T19:29:01.704Z
---

When a test class contains `@Nested` inner classes, `mvn test -Dtest=OuterClassName` can run **only the nested classes' tests** and none of the outer class's own `@Test` methods. Surefire still reports `BUILD SUCCESS`, and the per-class line reads `Tests run: 0 ... -- in OuterClassName` while the nested lines carry the whole count.

Seen on `InsulinManagementServiceTest` (36 in `DecodeIscStateTests` + 4 in `StrategySelectionTests` = 40 total, 0 from ~20 outer methods, 605s elapsed on Spring context startup for nothing).

**Why it matters for the verification gate:** a newly added outer-class test can be reported as passing when it never ran. Always read the per-class `Tests run:` lines, not just the total and BUILD SUCCESS — a `Tests run: 0` on the class you edited is the tell.

**Workaround:** address methods explicitly, `-Dtest='ClassName#methodA+methodB'` — that does execute outer-class methods.

CI is unaffected: with no `-Dtest` filter, surefire uses the pom's `**/*Test.java` include and runs outer and nested alike. This is a local-invocation artifact only.

Related: [[feedback_repo_test_placement]], [[project_maven_stale_classpath]], [[feedback_green_light_closeout]].
