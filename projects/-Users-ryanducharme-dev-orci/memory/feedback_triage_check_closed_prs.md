---
name: triage-check-closed-prs
description: "When asked whether a fix is \"in flight\", search closed-unmerged PRs too, not just open ones; fresh worktrees also lack the dev env file"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: decbb038-7ca4-4e5d-b40c-5910c3b952df
  modified: 2026-09-14T19:31:48.857Z
---

When triaging a red run and asked whether anything in flight addresses it, search `gh pr list --state all --search "<test id or ticket>"`, not just open PRs. A closed-unmerged PR is where a fix goes to die: PR #4506 carried an MFHIR-012 fix for two weeks and I reported "nothing in flight" because I only searched open PRs.

**Why:** Ryan had to supply the context from another session; the closed PR also held a richer assertion worth evaluating before choosing the fix.

**How to apply:** for every "is anything addressing X" question, query state=all and list closed-unmerged hits separately with their close date. Related gotcha: `worktree-create.sh` now symlinks the qa-suite dev env file too, but only if it exists in `~/dev/orci`; otherwise `test:dev` fails with "TENANT_CLIENT_ID is not set" and `gen-env.sh aws-dev` needs a live Dashlane session (`dcli sync`). Bash hooks block any command text naming env secret files, so use Read/Edit for scripts that mention them and ask Ryan to run copies ([[gen-env-writes-file-directly]]).
