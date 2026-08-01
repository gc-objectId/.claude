---
name: or2649-facility-derivation
description: "OR-2649 DONE — Mayo facility derives from 4th token of operating_room_name; ROJB=Methodist is evidence-backed; stays in Metabase, no repo SQL"
metadata: 
  node_type: memory
  type: project
  originSessionId: 06910925-6c03-47c0-8eee-36d01b0d97b1
  modified: 2026-07-31T19:37:52.369Z
---

OR-2649 ("Add a facility label to operations") closed Done 2026-07-31 as **validated, deploy-ready with no code change**. Mayo facility derives from the campus token in `operations.operating_room_name` — the 4th space-delimited word — mapped ROEI/ROJB → Rochester Methodist Hospital, ROMB → Saint Marys Hospital, anything else → NULL so gaps stay visible.

Two things that will come up again:

- **ROJB → Methodist looks wrong and is right.** The Joseph Building reads as Saint Marys campus by name. But all 15 ROJB rooms appear in Epic's Methodist OR export under authorized location `RST ROEI OR [101016]`, and fixture `rosmc-siu-s14-after.hl7` carries room `RM OR 10 ROJB 01 107` with AIL-4 department `ROEIOR`. Epic's OR-service grouping is the operative definition, not the building name. Verified 0 mismatches across all 126 rooms.
- **The mapping deliberately lives in Metabase, not the repo.** `orci/src/main/analytics/` is DDL (`CREATE OR REPLACE VIEW`), so checking the derivation in there would materialize database views — the schema change Theo's resolution explicitly ruled out. Don't "helpfully" add it to the analytics layer.

Known gap, not a blocker: reports spanning pre-2026-07-10 history under-count, because the older schemas hold bare room names — see [[mayo-data-lives-in-stage]].
