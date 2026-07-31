---
name: reference_webapp_no_unit_runner
description: orci webapp has no frontend unit test runner; how to validate pure frontend TS logic without one
metadata: 
  node_type: memory
  type: reference
  originSessionId: e2b3172b-0b76-44f6-bbe6-38f3299b5496
  modified: 2026-07-31T13:42:03.855Z
---

The `orci/src/main/webapp` webapp has **no unit test runner** — no vitest/jest, no `test` script, zero unit tests (only Storybook + `tsc` typecheck). So pure frontend logic (e.g. `utils/hl7Templates.ts` HL7 builders) can't be locked with a fast unit test yet. Standing up the runner is **OR-2702** (vitest + RTL + jsdom, wired to the pre-merge CI gate OR-2647).

To validate a pure frontend TS module (no React) without a runner, transpile+run it in Node via the webapp's own esbuild:
```
cd orci/src/main/webapp
# write a tiny .ts entry that imports the module by ABSOLUTE path (relative resolves from the entry file's dir, not cwd)
./node_modules/.bin/esbuild --bundle /tmp/run.ts --platform=node --format=cjs --outfile=/tmp/run.cjs && node /tmp/run.cjs
```
This ran `hl7Templates.ts` `build()` to confirm generated HL7 output during OR-2644 validation.

For frontend behavior whose real substance is a backend contract, prefer validating at the backend layer: e.g. OR-2644's SIU-template fix was proven by the exact generated `AIL` string matching what `MayoHL7SiuCaseSchedulingProcessorTest` already asserts. A qa-suite e2e is a poor fit for pre-merge frontend validation — local qa-suite needs the webapp bundled into the backend (`-P package-webapp`; the `:3000` Vite server breaks tenant/auth), and CI runs post-deploy against dev (= `main`), so it can't exercise an unmerged frontend change. See [[feedback_validate_against_main]].
