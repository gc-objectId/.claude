# OR-3110 — Limit review suggestion blocks to complete in-hunk fixes

Status: Testing   Assignee: Ryan Ducharme

## Description

The Claude PR review has no rule for when a finding may use a GitHub suggestion block. A suggestion block invites a one-click commit, so a sketch, a fix that spans files, or a fix that leaves a choice to the author can land wrong code.

Add a rule to REVIEW.md: use a suggestion block only when the fix replaces exactly the lines the comment is attached to, in one contiguous range, and is correct to commit as written. Otherwise use prose or a fenced code block.

## Comments (0)

(none)
