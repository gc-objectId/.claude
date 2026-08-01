---
name: reference_datajpatest_ddl_auto_not_liquibase
description: "orci-repositories @DataJpaTest builds its schema from entities (ddl-auto=create), so repo tests cannot validate Liquibase migrations"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e7da2ca4-206f-486b-951e-a0f0304cba18
  modified: 2026-07-31T19:03:23.027Z
---

`BaseDataJpaTest` (orci-repositories) runs Testcontainers Postgres with `spring.jpa.hibernate.ddl-auto=create` — the schema is generated **from the JPA entities**, never from Liquibase.

Consequence when deciding automation for a "new column" ticket: a repository round-trip test proves the field is persistable and that Hibernate's implicit naming works, but it **cannot** catch a Liquibase changeset that is missing, misnamed, or wrong-typed — Hibernate just creates the column it wants and the test passes either way. Writing one to "cover the migration" is coverage in name only.

Nothing in the repo validates tenant Liquibase changesets automatically. Entity↔column↔migration agreement is a **manual-validation** concern: run the real path against a Liquibase-built schema (local `mayo-mayo`/`demo-*` schema, or dev/stage) and read the column back with psql.

Also note `Operation` is `@Audited` but Envers is disabled globally (`hibernate.integration.envers.enabled: false` in `application.yml`), so adding a column needs **no** `_AUDIT`/`_aud` table change.

See [[feedback_repo_test_placement]] for where repo tests live and which names CI runs.
