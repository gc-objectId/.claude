---
name: 1962hc-golden-config-barcodes
description: "How the 1962HC golden config was defined (Oct 2026), the Honeywell menu-barcode format that was verified, and where the printable barcodes live"
metadata:
  node_type: memory
  type: project
  originSessionId: 166c4573-05e6-4803-a690-36178f7b7147
  modified: 2026-11-06T12:46:22.787Z
---

Golden config for the MGH 1962HC pairs lives in `~/Documents/09.2026 Honeywell 1962hc firmware updates/golden-config/` (README.md, PRINT-ME.html/.pdf, per-step SVG/PNG + .txt command strings, gen.py). Defined 2026-10-22 from the 16 post-flash menuget snapshots: backslash prefix `PREBK2995C5C`, no suffix, `DLYMSG200`, `BEPLVL2`, `BT_PIB1`, `TRMUSB124`, data formatter `DFM_EN1` + `DFMBK30099999999F32000E620F100` (drops the first run of spaces; this is the "space suppression" from the old 1902 deck). Applied as 3 barcodes: `DEFOVR;DEFALT.` (reset + unlink, re-dock), settings (`PREBK2995C5C;DLYMSG200;BEPLVL2;BT_PIB1;TRMUSB124.`), data format (`DFM_EN1;DFMBK30099999999F32000E620F100.`). On 2026-10-23 Ryan did OR 12 and OR 34 by barcode at MGH; the rest were mid-surgery and are left for the next visit. Lesson: a rejected command (the guessed `PRECA299;SUFCA299` clears) stops the rest of a chained menu barcode, so the prefix goes first and clears are omitted. Golden captured 2026-11-06 from spare base 24228B24CE (flashed to GY000251BAA, needs AC power to flash) using the OR37-labelled scanner: `golden-config/golden-spare1.txt`, push file `golden-push.txt`, and `SMU_3.0.0.30/logs/golden.txt` is now the `flash-pair.bat` reference. The diff against all 16 Sept snapshots found four fleet settings a reset wipes, now Step 2b: `DLYRRD2000;BASORD30;BT_ORD3000;BLEMCE0.` After that the golden matches the fleet on every non-identity token. **Field rule from 2026-11-06: never scan the factory reset (`DEFOVR;DEFALT.`) in an OR.** OR 11 would not relink after it and went into a case with no scanner; the field sequence is now 2, 2b, 3 only (no unlink). Relink recovery order: wait 30 s docked, scan the pairing barcode on the bottom of the base, try the spare base, pull the scanner battery (T9), then SMU. Gotchas: in PowerShell quote any `smu.exe /cmd "a;b."` string (`;` splits commands); after DEFALT the base may need a power-cycle before SMU sees it again. OR PCs are locked, so field verification is a scan into the login field. Field guide artifact: https://claude.ai/artifact/Sp1WVnz2dDXmEFDdXFVcEm

Honeywell menu barcode format, verified by decoding Honeywell's own REVINF barcode: Code 128, command string ending in `.`, trailing FNC3, no `~` (their 2009 spec also allows a `~` start char; fallback page included). Aztec menu symbols = reader-initialisation flag (`zint --init`). zint 2.16 cannot emit FNC3 in Code 128, hence the custom encoder `c128.py` (patterns from python-barcode).

GuidedOR does not key on the backslash: `parseBarcode` trims backslashes and strips a leading `PO`; the keypress listener ignores Enter. The prefix/no-suffix convention is for the workstation, not the app.

**Why:** OR 35's snapshot was never a true golden; the fleet had two decoder-tuning families and OR 12 had a stray config. A factory reset plus these explicit settings is the reproducible definition.
**How to apply:** after the first pair is reset+configured in the OR, capture `smu.exe /menuget` from it and make that the reference file for `flash-pair.bat`; then update the Confluence page [[mgh-1962hc-scanner-fleet]] (Atlassian MCP was down on 2026-10-22, so the page still says "no true golden yet").
