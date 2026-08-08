---
name: running-a-worktree-build-alongside-the-main-local-app
description: "Ryan runs main backend (8080) + Vite (3000) from ~/dev/orci and will not stop them — to test a worktree branch, give explicit instructions to build and run it on port 8081, never \"restart your local\"."
metadata: 
  node_type: memory
  type: reference
  originSessionId: fe6c5271-8c44-4138-a478-171873e194b2
  modified: 2026-08-07T16:14:15.024Z
---

Ryan's standing setup: `~/dev/orci` on `main`, backend on **8080**, Vite webapp on **3000**. He does not switch that off. Any instruction to test branch code against a running app must be explicit end-to-end commands for a **second instance on another port** — "restart your local on this branch" is not actionable and he will ask for the steps.

From the worktree directory:

```bash
# 1. Full reactor, NOT a hand-listed -pl set. ~/.m2 is SHARED with ~/dev/orci, so
#    whichever built last wins; re-run whenever the main dir has rebuilt since.
#    A curated -pl list goes stale every time a module is added (orci-utils and
#    epic-integration-support both appeared this way) and fails one module at a
#    time. See [[project_maven_stale_classpath]].
mvn -o -DskipTests install

# 2. -P package-webapp is REQUIRED for any UI-driven test. Without it the API works
#    but there is no frontend: login page has no #username and every UI test times out.
#    Skippable for API-only tests (saves several minutes).
mvn -o -pl orci -DskipTests -P package-webapp install

# 3. ~55s to boot; wait for "Started OrciApplication". 8081 serves the packaged
#    frontend — no separate Vite needed.
SPRING_PROFILES_ACTIVE=local mvn -o -pl orci spring-boot:run \
  -Dspring-boot.run.jvmArguments="-Dserver.port=8081 -Dtenants.demo.qa.enabled=true"

# 4. Point qa-suite at it (see [[feedback_npm_script_test_commands]])
BASE_URL=http://localhost:8081 npm run test:local -- <spec> --project=clinical-rules --no-deps

# 5. Stop
kill $(lsof -ti tcp:8081)
```

**Safe to run both:** Quartz has `isClustered: true`, so the two instances coordinate on the shared job tables rather than double-firing.

**Shared database is the real caveat:** both instances use the same Postgres and Redis, and qa-suite `globalSetup` resets the `demo-qa` tenant every run — so testing against 8081 still wipes `demo-qa` out from under the 8080 app. Warn Ryan before running if he may have work in flight there. `demo-demo` is never touched.
