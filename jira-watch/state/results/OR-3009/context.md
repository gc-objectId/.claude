# OR-3009 — Buffer for Tylenol max cumulative dose

Status: Testing   Assignee: Ryan Ducharme

## Description

*Current behavior*
The 24-hour total is every acetaminophen administration in the strict 24 hours before the check. It drives the max-dose warning, the scan alert, and the save alert. The single-dose alert does not use it.

*Rule by rule*

||Rule||Now||After||
|w-acetaminophen-max-dose (warning)|Warns within the warning amount of the limit on a strict 24h total; caps dose; counts for compliance|Same, with 30-minute buffer (e.g. at 23h30m)|
|a-acetaminophen-max-dose-scan (alert)|Alerts when the strict 24h total has reached the limit|Same, with 30-minute buffer|
|a-acetaminophen-max-dose-save (alert)|Alerts when the strict 24h total plus this dose exceeds the limit|Same, with 30-minute buffer|
|a-acetaminophen-early-redose (alert)|This dose over the single-dose max (4-6h).|Same, with 15-minute buffer|

Calculate cummulative doses at 23h30min, redoses are calculated at time interval (4-6hr) - 15min.

## Comments (0)

(none)
