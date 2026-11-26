# Proposed tests for OR-3176

Write exactly these.

## OR-3176#0

- **file**: `qa-suite/clinical-rules/antiemetic-redose.spec.ts`
- **assert**: AER-001 (@supplemental): on a mayo-mayo case with an m-aprepitant admin bolus 6h ago, POST /api/cds/medication-selection for m-aprepitant returns a w-antiemetic-early-redose result whose displayText matches /^Patient received Aprepitant at .* Aprepitant is dosed once every 24 hours\.$/ and cites r-antiemetic-early-redose; a second patient with the dose 25h ago returns no such result, the 6h patient being the control that proves the absence is window-driven.
- **id**: `AER-003` (reserved for you — use this one, not the one in the line above)

## OR-3176#1

- **file**: `qa-suite/clinical-rules/antiemetic-redose.spec.ts`
- **assert**: AER-002 (@supplemental): on a mayo-mayo case with an m-granisetron-transdermal bolus 1h ago, selecting m-granisetron and selecting m-granisetron-transdermal both return no w-antiemetic-early-redose result; then an m-granisetron-tablet bolus 2h ago is added and selecting m-granisetron fires naming Granisetron, the control proving the earlier silence was the transdermal exclusion and not a staging failure.
- **id**: `AER-004` (reserved for you — use this one, not the one in the line above)

