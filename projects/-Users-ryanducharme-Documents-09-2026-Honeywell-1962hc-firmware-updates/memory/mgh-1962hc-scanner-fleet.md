---
name: mgh-1962hc-scanner-fleet
description: "MGH Honeywell Xenon Ultra 1962HC scanner fleet (19 pairs), Sept 9 2026 firmware update, where the Confluence write-up and working folder live"
metadata: 
  node_type: memory
  type: project
  originSessionId: 166c4573-05e6-4803-a690-36178f7b7147
  modified: 2026-11-06T11:27:46.836Z
---

Guided maintains 19 Honeywell Xenon Ultra 1962HC handheld + CCB-U00-HC base pairs at MGH for the study there, labeled OR 4..43. On 2026-09-09 Ryan spent ~12 hours on site flashing 16 of them to handheld GX000435BAA / base GY000251BAA with SMU 3.0.0.30 via `flash-pair.bat` on two Windows PCs. As of 2026-11-06 (per Alex): OR 4, 32, 35 missing (39 was missing in Sept, status unconfirmed), OR 7 sent for RMA. Two spare bases exist, no spare scanners; spare base SN 24228B24CE was on GY000190BAA and was flashed to GY000251BAA on 2026-11-06. OR 35 is only a reference config, not a true golden: the fleet has several slightly different configs and Ryan intends to consolidate to one real golden image and push it to every pair (artifact home undecided, GitHub vs OneDrive; may become a Jira ticket). OR 12's odd config was fixed by Alex scanning the restore-all-settings barcode. The two Windows PCs are Guided's spare boxes for this kind of work. Firmware .smoc files need a Honeywell support-portal login for the Software Downloader.

Confluence write-up: Engineering space > QA folder > "Xenon Ultra 1962HC Scanners" (page 478904321, https://guidedclinical.atlassian.net/wiki/x/AYCLH). Rewritten 2026-09-22 with inventory table, procedure, script source, open items.

Working folder (SMU build, firmware .smoc, script, logs from both PCs): `~/Documents/09.2026 Honeywell 1962hc firmware updates`. Day-of tracker xlsx is in Ryan's OneDrive ("MGH Honeywell 1962h Scanners.xlsx").

**Why:** the page is the team reference for the fleet; the folder is the only copy of the run logs and golden config.
**How to apply:** when scanner firmware/config comes up again, start from the Confluence page and this folder; update the inventory table rather than the tracker xlsx.
