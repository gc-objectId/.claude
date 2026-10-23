---
name: 1962hc-golden-config-barcodes
description: "How the 1962HC golden config was defined (Oct 2026), the Honeywell menu-barcode format that was verified, and where the printable barcodes live"
metadata:
  node_type: memory
  type: project
  originSessionId: 166c4573-05e6-4803-a690-36178f7b7147
  modified: 2026-10-23T12:45:21.578Z
---

Golden config for the MGH 1962HC pairs lives in `~/Documents/09.2026 Honeywell 1962hc firmware updates/golden-config/` (README.md, PRINT-ME.html/.pdf, per-step SVG/PNG + .txt command strings, gen.py). Defined 2026-10-22 from the 16 post-flash menuget snapshots: backslash prefix `PREBK2995C5C`, no suffix, `DLYMSG200`, `BEPLVL2`, `BT_PIB1`, `TRMUSB124`, data formatter `DFM_EN1` + `DFMBK30099999999F32000E620F100` (drops the first run of spaces; this is the "space suppression" from the old 1902 deck). Applied as 3 barcodes: `DEFOVR;DEFALT.` (reset + unlink, re-dock), settings (`PREBK2995C5C;DLYMSG200;BEPLVL2;BT_PIB1;TRMUSB124.`), data format (`DFM_EN1;DFMBK30099999999F32000E620F100.`). On 2026-10-23 Ryan did OR 12 and OR 34 by barcode at MGH; the rest were mid-surgery and are left for the next visit. Lesson: a rejected command (the guessed `PRECA299;SUFCA299` clears) stops the rest of a chained menu barcode, so the prefix goes first and clears are omitted. The real golden `menuget` is still uncaptured; next visit bring a Guided Windows box with SMU and capture it from OR 12 or 34 first. OR PCs are locked, so field verification is a scan into the login field. Field guide artifact: https://claude.ai/artifact/Sp1WVnz2dDXmEFDdXFVcEm

Honeywell menu barcode format, verified by decoding Honeywell's own REVINF barcode: Code 128, command string ending in `.`, trailing FNC3, no `~` (their 2009 spec also allows a `~` start char; fallback page included). Aztec menu symbols = reader-initialisation flag (`zint --init`). zint 2.16 cannot emit FNC3 in Code 128, hence the custom encoder `c128.py` (patterns from python-barcode).

GuidedOR does not key on the backslash: `parseBarcode` trims backslashes and strips a leading `PO`; the keypress listener ignores Enter. The prefix/no-suffix convention is for the workstation, not the app.

**Why:** OR 35's snapshot was never a true golden; the fleet had two decoder-tuning families and OR 12 had a stray config. A factory reset plus these explicit settings is the reproducible definition.
**How to apply:** after the first pair is reset+configured in the OR, capture `smu.exe /menuget` from it and make that the reference file for `flash-pair.bat`; then update the Confluence page [[mgh-1962hc-scanner-fleet]] (Atlassian MCP was down on 2026-10-22, so the page still says "no true golden yet").
