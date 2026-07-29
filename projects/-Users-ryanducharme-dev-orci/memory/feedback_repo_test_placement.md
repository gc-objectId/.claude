---
name: feedback_repo_test_placement
description: "Where backend repository/@DataJpaTest tests live, and the *Test vs *IntegrationTest CI-run convention"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9601188-3582-4aaf-8ee4-ba69f76eb652
  modified: 2026-07-28T15:27:47.611Z
---

Repository / `@DataJpaTest` slice tests belong in `orci-repositories/src/test` (the module that owns the repository), extending `BaseDataJpaTest` — NOT in `orci`. Theo flagged an OR-2632 follow-up where I added `MedicationAdministrationRepositoryTest` in `orci` when a canonical one already existed in `orci-repositories`.

**Why:** repo-slice tests belong with the repositories they exercise; a duplicate class name across modules is confusing and the coverage should extend the existing suite, not fork it.

**How to apply:** before writing a new test, check where that class's test suite already lives (grep the whole repo for `<Class>Test`) and extend it. Don't model a new test on a nearby file without confirming that file isn't itself misplaced — the `orci` module had stray duplicate repo tests (`InfusionMedicationAdministrationRepositoryTest`) that I copied from; both got relocated into `orci-repositories`.

**CI-run convention (the other half of what bit here):** test *name* controls whether CI runs it. `*Test` runs in the default build (`mvnw install`); `**/*IntegrationTest.java` is EXCLUDED from the default build and runs only under `-P integration-tests` — which currently has no automatic trigger (see [[project_premerge_ci_gate]]; tracked in OR-2687). So name a backend test `*IntegrationTest` only when you intend it to skip CI. Prefer the lightest layer that covers the risk: unit (mocked) → `@DataJpaTest` repo slice (real Postgres, runs in CI) → full `@SpringBootTest`.
