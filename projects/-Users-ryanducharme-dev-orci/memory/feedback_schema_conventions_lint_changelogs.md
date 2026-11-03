---
name: feedback_schema_conventions_lint_changelogs
description: "Theo's review preference: guard a schema convention by linting the Liquibase changelog files, not by asserting on the Postgres catalog after a Testcontainers replay"
metadata:
  type: feedback
---

On PR #4802 (OR-2809, 2026-11-02) Theo pushed back on a Spring Boot/Testcontainers test that queried `information_schema` after a full Liquibase replay to assert no zone-less timestamp column remained: "maybe this is better as a linter on migration files". Ryan agreed and we replaced it.

**Why:** the only way a convention regresses going forward is a new changeset, so the lint fires at authoring time, names the file and declaration, and runs in milliseconds with no Docker. The catalog check reports the resulting column after a full boot and cannot say where it was typed.

**How to apply:** for "no changeset may ever declare X" rules, write a plain JUnit test in `com.guided.orci.configuration.liquibase` that parses both `db.changelog-master.xml` files, walks the `<include>` list after a named boundary changeset (historical changesets are immutable because of checksums, so there is always a boundary), and checks type positions only: `type`/`newDataType` attributes plus `<sql>` bodies where a word precedes the type. Whole-text regex is too noisy: tenant 238 has the word in a prose comment and 239 has a `::timestamp` cast. Prove red with probe changesets appended to both masters, then remove them. Pattern lives in `ChangelogTemporalTypeTest`.
