---
name: reference_devtools_restart_on_mvn_test
description: "A classpath-launched worktree app restarts itself (Spring DevTools) when a concurrent `mvn test` recompiles orci/target/classes — port refuses for ~20s mid-validation"
metadata:
  node_type: memory
  type: reference
  originSessionId: b0822a53-7340-40ee-8642-10d0a2405f89
  modified: 2026-10-30T14:29:35.015Z
---

A worktree app launched off `orci/target/classes` + `runtime-classpath.txt` (see [[reference_run_worktree_app_second_port]]) has Spring DevTools on the classpath. Running `mvn -pl orci -am test -Dtest=…` in the same worktree recompiles `orci/target/classes`, DevTools notices and does a `restartedMain` restart: the port refuses connections for ~20s (`ECONNREFUSED`, in-flight requests get a 500 "Unable to rollback against JDBC Connection"), then it comes back on the same PID.

**How to apply:** don't run a maven build/test in the worktree while exercising the app on 8081/8082, or expect to retry the request after the restart. Tell-tale in the log: `Started OrciApplication in 18 seconds (process running for 262)`.
