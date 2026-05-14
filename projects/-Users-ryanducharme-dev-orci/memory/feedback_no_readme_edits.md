---
name: Never edit project root README.md
description: QA-specific and build-tooling notes go in qa-suite/tests-readme.md or the project CLAUDE.md, not the root README
type: feedback
originSessionId: e7f868ae-1b22-4cf8-8154-3cefcbb5ce39
---
Do not modify `/Users/ryanducharme/dev/orci/README.md`.

**Why:** Theo flagged that QA-specific setup and build-tooling notes don't belong in the root README. That file is for onboarding/general project info. Build quirks go in the project `CLAUDE.md`; qa-suite-specific setup goes in `qa-suite/tests-readme.md`.

**How to apply:** Any time you would add to README.md, redirect to the appropriate file instead. If something genuinely belongs in the root README (e.g. a new top-level feature), flag it to Ryan rather than editing it directly.
