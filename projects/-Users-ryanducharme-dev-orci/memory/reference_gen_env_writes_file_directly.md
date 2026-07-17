---
name: gen-env-writes-file-directly
description: "gen-env.sh writes .env.{suffix} directly (aws-dev → .env.dev); `> .env` redirect truncates .env to empty"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 7db59caa-cbb0-46b3-b808-9206670a4ca0
---

`qa-suite/gen-env.sh` writes its output straight to `.env.{suffix}` (e.g. `aws-dev` → `.env.dev`) and prints only "Wrote .env.dev" to stderr. The older documented usage `./gen-env.sh > .env` (still shown in qa-suite CLAUDE.md as of 2026-07) captures nothing and **truncates `.env` to empty** — symptom: dotenv "injecting env (0) from .env".

**How to apply:** run `./gen-env.sh aws-dev` with no redirect; load via `TEST_ENV=dev`. Consider fixing the stale doc line in qa-suite/CLAUDE.md when next touching it.
