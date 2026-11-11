# OR-2786 — Case start time should be the anesthesia start, not the first milestone to arrive

Status: Testing   Assignee: Ryan Ducharme

## Description

A case records its start time from whichever start milestone happened to arrive first, which is not always the anesthesia start and is not always the earliest time. Epic also corrects a milestone time seconds after sending it, and nothing applies the correction, so the case keeps the original value.

Example, operation 1524022289 on 2026-08-10. In Room arrived first at 13:13:18 and started the case. Anes Start arrived 40 seconds later carrying 13:13:00, then was corrected to 13:12:00 one second after that. The case recorded 13:13:18, 78 seconds after anesthesia actually began.

How widespread, measured on prod before the change:

* Mayo: 1,097 of 1,562 cases (70%) have a start milestone earlier than the recorded case start. Median 176 seconds, worst 62 minutes. An anesthesia start is the earlier milestone on 1,041 of them.
* MGB snapshot: 36,509 of 151,745 cases (24%), median 300 seconds.

This matters beyond reporting: the case start is the lower bound of the window findOperationBasedOnStartTime uses to decide which case an incoming med admin, observation or glucose reading attaches to. A case start recorded minutes late leaves records in that gap unattached.

Fix: store the anesthesia start time on the operation and set the case start from it, for both the Mayo SIU feed and the MGB notification feed, applying corrections in either direction. Backfill the new column from the recorded case start for existing cases.

PR: https://github.com/guidedclinical/orci/pull/4390

## Comments (0)

(none)
