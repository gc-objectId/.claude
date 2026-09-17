---
name: java25-local-jdk
description: "main builds on Java 25 since 2026-09-15 (OR-2926); this Mac's default JDK is Corretto 21, Homebrew's openjdk formula (25) works via JAVA_HOME, the corretto@25 cask needs sudo"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8a468fe1-b26a-463e-87fc-849522f32917
  modified: 2026-09-17T13:50:21.250Z
---

`pom.xml` has `<java.version>25</java.version>` since OR-2926 (2026-09-15). `/usr/libexec/java_home` only
knows Corretto 21, so a bare `mvn` fails with `invalid target release: 25` on any branch rebased past
that commit. The `.sdkmanrc` names `25.0.4-amzn` but SDKMAN is not installed here.

What works without sudo:

```bash
JAVA_HOME=$(brew --prefix openjdk)/libexec/openjdk.jdk/Contents/Home mvn -pl orci -am test -Dtest=...
```

`brew install --cask corretto@25` is the team-recommended install but runs a pkg installer under sudo,
so Ryan has to run it himself (`!` prefix). Once installed, `/usr/libexec/java_home -v 25` resolves.

**How to apply:** when a build on a fresh rebase dies in `orci-utils` with the target-release error, it is
the JDK, not the branch. Set JAVA_HOME as above rather than touching `java.version`.
