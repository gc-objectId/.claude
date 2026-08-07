---
name: unowned-tickets-by-design
description: "Ryan's large unassigned Jira backlog is a deliberate issue register, not a process failure"
metadata: 
  node_type: memory
  type: project
  originSessionId: 160576e1-880b-4ec9-910a-3f5ca2856439
  modified: 2026-08-06T18:19:49.120Z
---

Ryan files a lot of tickets he never picks up — ~27 of 33 reported-to-others tickets sit unassigned. **This is
intentional.** Guided is a five-person company with many moving parts; filing is how they avoid losing sight
of known issues, and Ryan starts the genuinely important ones himself.

**Why this matters:** don't read the unowned pile as a capacity problem, a routing failure, or something a
goal or process change should fix. Reporting it back as a symptom mischaracterizes a working practice — Ryan
corrected exactly that read on 2026-08-06.

Related: he'd already started **OR-2653** before it was raised as urgent, and solved it better than the
obvious fix — removing jasypt entirely (dependency, maven plugin, `CryptoUtils`, all `ENC()` values) in favor
of `${VAR}` placeholders that default empty in `application.yml` so local dev boots, and carry no default in
deployed profiles so a missing value hard-fails at startup. Secret values live in a shared Dashlane vault.
Worth assuming he has more context on his own tickets than a Jira title conveys. See [[ryan-role-scope]].
