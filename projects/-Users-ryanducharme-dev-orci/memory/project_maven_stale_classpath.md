---
name: Maven stale classpath when orci depends on sibling modules
description: Test compile in orci module may fail on "cannot find symbol" for members that exist in orci-models / orci-repositories / orci-multitenancy — local Maven repo cache is stale. Fix: `mvn -pl <sibling-modules> install -DskipTests` then retry.
type: project
originSessionId: a42f1904-a4d1-4e7a-a26c-cca8513fe6f3
---
Two failure modes — same root cause (stale `~/.m2` jar), different symptoms:

**At test compile time:** `mvn -pl orci test` fails with `cannot find symbol` for members that exist in sibling modules. Maven resolved a stale jar instead of the current source.

**At runtime:** App boots with `NoSuchMethodError` after a `mvn clean package` when a sibling module's API has changed. The compiled `orci` classes reference a method that the cached `~/.m2` jar doesn't have yet.

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
