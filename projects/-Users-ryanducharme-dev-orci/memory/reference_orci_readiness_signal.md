---
name: reference-orci-readiness-signal
description: "Waiting for orci to be up: /actuator/health/readiness is the correct signal; the base /actuator/health 403s and the 'Started OrciApplication in' log line fires too early"
metadata:
  node_type: memory
  type: reference
---

To wait for a booting orci instance, poll `/actuator/health/readiness` — never `/actuator/health`, and never the `Started OrciApplication in` log line.

- `/actuator/health/readiness` and `/actuator/health/liveness` are `permitAll` (`SecurityConfiguration.java:191`). The **base** `/actuator/**` path requires admin, so `/actuator/health` returns **403** — that 403 is what makes people wrongly conclude probes don't work here.
- Readiness flips to UP at `ApplicationReadyEvent`, which is the *last* thing `SpringApplication.run()` does. The `Started OrciApplication in` line is logged **earlier**, before `callRunners()`.
- The clinical-config import (`com.guided.orci.spring.ApplicationRunner`) is a **`SmartLifecycle`** (phase `INITIALIZE_APP_DATA` = -98), not an `ApplicationRunner` despite the class name, so it completes during context refresh — before both signals. `DefaultUserSetupRunner`, `TenantSetupRunner`, and `AdminUserSetupRunner` are the same (see `StartupPhase`).

So readiness is strictly the safest of the three. Measured cold boot on a blank database with mayo + demo-qa enabled: **~60s** to readiness.

This corrects the constraint written into OR-2789 and the [[project-jira-watch-autovalidate]] loop, which claimed an HTTP probe reports ready while the app is still initialising. It does not.

Related: [[project-premerge-ci-gate]].
