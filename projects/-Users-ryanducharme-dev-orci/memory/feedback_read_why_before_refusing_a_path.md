---
name: read-why-before-refusing-a-path
description: "Before adding a refusal or guard that closes an existing code path, read the commit that opened it and trace the downstream all the way through"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
  modified: 2026-11-06T13:28:16.797Z
---

Before a fix closes off a path (a new 400/404, a required field), run `git log -L`/`git log -- <file>` on the lines and read the commit that created the path, then follow the value all the way through the downstream code, not just to the first place it looks unsafe.

**Why:** On 2026-11-06 (PR #4727, Theo's "if patient id is null…"), I refused an Event Center start with no PMRN because `handleCaseStart` reads `event.getPatientId()`. Fifteen lines later the method falls back to the PMRN from the EHR's surgical record, and the commit that introduced the null (e13336081, OR-3076) said in its body that this was deliberate, because MGB resolves the case by its id. The bot caught it a round later, and my posted reply to Theo had promised the wrong behavior. Ryan: "not sure why you didn't catch that in the first place, it was your response!"

**How to apply:** For any reviewer concern of the form "X can be null/empty downstream", list every consumer and read each one through to its end before choosing between "fill it" and "refuse it". Draft PR replies only after that trace, because the reply states the behavior. See [[pr-replies-manual]].
