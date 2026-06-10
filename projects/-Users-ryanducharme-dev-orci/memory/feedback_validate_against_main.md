---
name: feedback_validate_against_main
description: "Guided's current SDLC merges dev work to main before validation, so validate against main"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a8f15aea-c106-4f0e-bd7a-14677b43ae06
---

At Guided (as of 2026-06), the SDLC merges dev work into `main` when the implementer considers it done, and validation/QA happens *afterward* against `main`. So the running app under test is the `main` build, not a feature-branch deploy.

**Why:** Ryan is actively working on changing this (validation-before-merge would be better), but it's the current SOP — validation steps should assume main is what's deployed.

**How to apply:** When giving E2E / manual validation steps, point the app-under-test (BASE_URL / running backend) at a build that has the merged code — i.e. main. The *test code* for a ticket still lives on the feature/worktree branch; run that test code against the main-based backend. Don't tell Ryan a test will "fail because the feature branch isn't deployed" — the feature code is already merged. Relates to [[feedback_git_pr_workflow]] and [[feedback_qa_suite_branch_sop]].
