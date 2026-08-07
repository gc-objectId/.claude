---
name: slack-huddle-canvases
description: "Theo's Slack huddle notes are AI-generated canvases — a meeting record Granola never sees"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 160576e1-880b-4ec9-910a-3f5ca2856439
  modified: 2026-08-06T19:05:06.305Z
---

Guided runs most standups and working sessions as **Slack huddles**, and Slack's AI posts the notes as a
**canvas** titled `:headphones: Huddle notes: M/D/YY in #channel`, authored by Theo. They include attendees,
a timestamped summary, and action items — often richer than what's in Granola, and **Granola never captures
them** (different tool, different meetings).

Find them: `slack_search_public_and_private` with `content_types="files"` and a query like `Huddle notes`
(add `after:`/`before:` date modifiers to scope). Read with `slack_read_canvas` using the file ID. The archive
goes back to at least July 2025. Main channels: `#product-dev` (C04T6RVDQSV), `#daily-scrum` (C065V63SPCH),
`#engineering` (C03NBFBN1PE, private).

**Always sweep both Granola and these canvases** when reconstructing what was decided — Ryan asked for exactly
this on 2026-08-06 after Granola alone missed the huddle record. Granola's free tier also caps history at
**30 days** and blocks transcripts, so the canvases are the deeper archive.
