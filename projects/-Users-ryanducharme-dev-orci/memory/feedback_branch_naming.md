---
name: feedback-branch-naming
description: "Branch prefix must match the Jira issue type — epic/, feature/, bugfix/, hotfix/"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 545d0b63-38da-44be-9c99-72528ddec965
---

Branch prefixes must match the Jira issue type of the ticket: Epic → `epic/`, Story/Task → `feature/`, Bug → `bugfix/`, urgent prod fix → `hotfix/`. Established 2026-06-11 after two mismatches: an epic (OR-2585) and a bug were both created as `feature/` branches.

**Why:** Branch names are the first signal of what kind of work is in flight; a `feature/` branch holding an epic or a bugfix misleads reviewers and breaks scanning of `git branch -r`.

**How to apply:** Before writing any files for a ticket, check the ticket's issue type in Jira and compare against the current branch prefix (`git branch --show-current`). If they don't match, rename with `git branch -m <correct-name>` (safe before pushing; after pushing, surface to Ryan first). The `workon` shell function takes the type as an optional third argument (`workon OR-1234 slug epic`) and defaults to `feature`. See the Branch naming table in global CLAUDE.md. Related: [[feedback-git-pr-workflow]].
