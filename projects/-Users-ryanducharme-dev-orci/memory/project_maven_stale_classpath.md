---
name: Maven stale classpath when orci depends on sibling modules
description: A stale `~/.m2` sibling jar makes `mvn -pl orci ...` ignore edits to orci-models/orci-repositories/orci-multitenancy — surfacing as "cannot find symbol", NoSuchMethodError, or a falsely-green flip-and-revert. Fix: `-am`, or install the siblings.
type: project
originSessionId: a42f1904-a4d1-4e7a-a26c-cca8513fe6f3
---
Two failure modes — same root cause (stale `~/.m2` jar), different symptoms:

**At test compile time:** `mvn -pl orci test` fails with `cannot find symbol` for members that exist in sibling modules. Maven resolved a stale jar instead of the current source.

**At runtime:** App boots with `NoSuchMethodError` after a `mvn clean package` when a sibling module's API has changed. The compiled `orci` classes reference a method that the cached `~/.m2` jar doesn't have yet.

**At validation time — the dangerous one:** a flip-and-revert check comes back **falsely green**. You edit `Concentration.java` in `orci-models`, run `mvn -o -pl orci test -Dtest=ConcentrationTest` expecting red, and it passes — so you conclude the guard is inert or your new test is worthless. The edit was never compiled; surefire ran against the `~/.m2` jar. Tell: an *existing* test that must also fail under the flip stays green too. Fix: add `-am` so the reactor builds the sibling from source.

```bash
mvn -o -pl orci -am test -Dtest=ConcentrationTest -Dsurefire.failIfNoSpecifiedTests=false
```

`-am` is preferable to `install` during validation — it leaves the shared `~/.m2` untouched, which matters when other worktree sessions are building concurrently (they overwrite each other's sibling jars).

**Why:** `mvn clean package` (or `mvn -pl orci test`) does not write updated sibling jars to `~/.m2`. The app or test classpath picks up whatever was last installed.

**How to apply:** Always use `mvn clean install -DskipTests` from the **repo root** after any change to a shared module (especially `orci-models`). This is the fix for both failure modes:

```bash
# From ~/dev/orci (repo root)
mvn clean install -DskipTests

# Then launch from orci submodule
cd orci && mvn spring-boot:run -Dmaven.test.skip=true
```

For targeted test runs only, pre-install just the siblings:
```bash
mvn -pl orci-models,orci-repositories,orci-multitenancy,client-integration-api,mgb-client-integration,orci-audit install -DskipTests -q
```
