---
name: feedback-engineering-approval-before-merge
description: A product approval (Alex) satisfies GitHub's 1-approval rule but Ryan still waits for an engineer (Theo or Jordan) before merging
metadata:
  type: feedback
---

Don't call a PR ready to merge on Alex's approval alone. Alex is product, so her review counts for clinical wording and citations only. Ryan waits for an engineering approval from Theo or Jordan (JEphron) before merging.

**Why:** On OR-2941 (#4779) I told Ryan Alex's approval was enough because main's ruleset and the review gate both passed. Ryan corrected me: the tooling allows it, but the team norm is an engineer's approval.

**How to apply:** When asked whether a PR can merge, check `latestReviews` for an APPROVED review from Theo or JEphron. A green review-gate check plus `reviewDecision=APPROVED` is necessary but not sufficient. Related: [[feedback-pr-replies-manual]].
