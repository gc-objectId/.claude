---
name: app-level-flip-by-bundle-swap
description: "Fastest app-level red check for qa-suite absence assertions: edit webapp source, npm run build, cp build/. into orci/target/classes/static — the running 808N serves it immediately, no restart"
metadata:
  node_type: memory
  type: reference
  originSessionId: 90e71c3b-3411-4986-9a6a-b989c7db0538
  modified: 2026-10-16T15:20:35.077Z
---

For a "should not render" assertion whose condition lives in app code, flip the app, not the test:
edit the webapp source, `npm run build` in `orci/src/main/webapp` (~5 s), then
`cp -R src/main/webapp/build/. target/classes/static/` from `orci/`. A `spring-boot:run` instance on 808N serves
`target/classes/static` live, so the next request gets the flipped bundle — confirm by matching the
`/static/index.<hash>.js` in the served `/login` HTML. Batch several flips that target different tests into one
build. Revert with `git restore orci/src/main/webapp/src`, rebuild, copy again, re-check the hash.

Commit the real fixes before any flip round: `git restore` on a spec file also discards uncommitted fixes in it
(OR-3079 lost one this way). Test-level flips (role swap, skipping the closing action, stubbing a different
response) cover conditions the test itself controls; `expect.soft` lets one flipped run report every absence line
in a test. See [[running-a-worktree-build-alongside-the-main-local-app]], [[feedback-validation-protocol]].
