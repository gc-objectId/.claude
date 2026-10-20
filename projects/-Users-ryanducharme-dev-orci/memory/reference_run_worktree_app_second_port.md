---
name: running-a-worktree-build-alongside-the-main-local-app
description: "Ryan runs main backend (8080) + Vite (3000) from ~/dev/orci and will not stop them — to test a worktree branch, give explicit instructions to build and run it on port 8081, never \"restart your local\"."
metadata: 
  node_type: memory
  type: reference
  originSessionId: fe6c5271-8c44-4138-a478-171873e194b2
  modified: 2026-10-19T14:19:44.876Z
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

**Preferred since 2026-10-16 (OR-3074): build without touching `~/.m2`.** Ryan's 8080 JVM loads sibling modules straight from `~/.m2/.../0.1.103-SNAPSHOT/*.jar`, so step 1's `install` swaps jars under his running app and leaves main's next boot on branch jars. Instead, one reactor `package` that also writes orci's runtime classpath (siblings resolve to their own `target/*.jar`, nothing is installed), then boot that classpath and serve the webapp from disk:

```bash
JAVA_HOME=$(brew --prefix openjdk)/libexec/openjdk.jdk/Contents/Home mvn -o -q -pl orci -am -DskipTests \
  package dependency:build-classpath -Dmdep.includeScope=runtime -Dmdep.outputFile=target/runtime-classpath.txt
(cd orci/src/main/webapp && npm run build)
nohup $(brew --prefix openjdk)/libexec/openjdk.jdk/Contents/Home/bin/java -XX:TieredStopAtLevel=1 -Duser.timezone=UTC \
  -Dtenants.demo.qa.enabled=true -Dserver.port=$PORT -Dspring.web.resources.static-locations=file:$PWD/orci/src/main/webapp/build/ \
  -cp "orci/target/classes:$(cat orci/target/runtime-classpath.txt)" com.guided.orci.OrciApplication --spring.profiles.active=local > app.log 2>&1 &
```

Readiness ~70–180s on `/actuator/health/readiness` (poll with node, curl is blocked). Because the frontend is read from `build/` per request, a frontend red check is just edit → `npm run build` → re-run the test, with no backend rebuild or restart (`OrciReactController` forwards to `/index.html` through the static handler). orci is not on spring-boot-starter-parent, so `package` yields no runnable fat jar; that's why it's a classpath launch.

**Safe to run both:** Quartz has `isClustered: true`, so the two instances coordinate on the shared job tables rather than double-firing.

**Shortcut when the branch equals `main` (e.g. validating a merged PR):** skip the build entirely and relaunch Ryan's already-running app off its own classpath — `ps -p <pid> -o command=`, then re-exec that argv with `-Dserver.port=8081` prepended. Boots in ~3 min with no `mvn install`. This is enough to exercise `ApplicationRunner` against the shared local Postgres, which is a real restart from the DB's point of view (OR-2731 used it to prove the checksum skip).

**Do not clean up with `pkill -f "Dserver.port=808"` or `kill $(lsof -ti tcp:8081)` blind.** Other concurrent Claude sessions in sibling worktrees use 8081/8082 for the same trick, and 8080/3000 can die under the load of two parallel maven integration suites. Record the PID your own launch printed and kill exactly that.

**Shared database is the real caveat:** both instances use the same Postgres and Redis, and qa-suite `globalSetup` resets the `demo-qa` tenant every run — so testing against 8081 still wipes `demo-qa` out from under the 8080 app. Warn Ryan before running if he may have work in flight there. `demo-demo` is never touched.

**Check the port the moment you launch, not at session start.** On 2026-10-15 a sibling session (OR-3064) took 8081 in the gap between the opening `lsof` and the `spring-boot:run` ~15 min later; the readiness poll then answered UP "after 2s" because it was reading the sibling's app, and the first qa-suite run executed against the wrong build. Tell-tales: readiness far faster than ~50s, and `ps -p <listener pid> -o command=` showing another worktree's classpath. Re-run `lsof -nP -iTCP -sTCP:LISTEN | grep 808` in the same command that boots the app and pick the lowest free port then.
