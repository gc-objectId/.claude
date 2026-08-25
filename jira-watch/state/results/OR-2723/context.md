# OR-2723 — Unify practitioner refresh and enable it for Mayo

Status: Testing   Assignee: unassigned

## Description

h3. Context

Manual practitioner refresh (Admin → Manage Data → Practitioners) was reachable for MGB only: {{PractitionersTab}} hid the per-row and bulk refresh controls behind a hardcoded {{tenantId.startsWith("mgb-")}} check. The backend was already Mayo-capable (OR-2642 moved both refresh paths off {{tenantKey.isMgb()}} onto FHIR-integration availability), so only the manual trigger was fenced off. Removing the UI gate alone would have pointed a Mayo button at a code path that does not match how Mayo practitioner data is actually keyed.

h3. Problem 1: two refresh implementations had diverged

The admin endpoint called {{PractitionerService.refreshPractitioner}}, a second copy of the logic in {{PractitionerRefreshService.refreshPractitioner}} (the async staleness path). Three divergences, each Mayo-hostile:

* It required a display name. Mayo's {{searchPractitioner}} ignores the name and looks the PERID up directly by identifier, so a practitioner built from an RXA-10 or SCH-20 with blank XCN.2/XCN.3 was refused despite having a usable key.
* It branched on {{practitioner.clientUserId}} while the async path branched on the linked {{User}}. Mayo never populates {{client_user_id}}, but {{MayoHL7SiuCaseSchedulingProcessor.resolveAnesthesiaProvider}} already reads practitioners by it treating it as the PROVID. If that column is ever written, the branch feeds a PROVID into a PERID-system search.
* It saved without {{markAsRefreshed}}, so a manual refresh left {{last_refreshed_at}} null and the automatic path kept re-querying ids that can never resolve.

h3. Problem 2: pass/fail hides the ordinary Mayo outcome

Mayo service-account PERIDs have no FHIR Practitioner behind them (SCH-20 sampling put service accounts at roughly two thirds of ids). The endpoint returned 200 or a bare 400, so "Epic has no record for this id" and "Epic is unreachable" were indistinguishable. Most of a Mayo refresh would render as failure and read as a broken feature.

h3. Delivered

* Deleted {{PractitionerService.refreshPractitioner}}. {{PractitionerAdminController}} now calls the refresh service, so manual and automatic refresh cannot diverge again.
* Lookup selection moved into {{chooseLookup}}, which passes whatever it has and lets each tenant's command decide what it needs. {{MGBPractitionerByNameAndEpicUserIdR4Command}} now returns empty on a blank name instead of querying Epic for {{name=null}}, which is what makes dropping the shared gate safe.
* New {{RefreshResult(RefreshOutcome, Practitioner)}}: REFRESHED, NO_MATCH, INSUFFICIENT_DATA, UNSUPPORTED_TENANT, FAILED. Only FAILED is non-2xx (502). Bulk reports refreshed / noMatch / skipped / failed instead of succeeded / failed.
* New {{GET /api/admin/practitioners/capabilities}}, answered by {{CommandFactoryProvider.supportsTenant}} (registry check, no client construction). The UI consumes it through the generated client and no longer keeps a list of which orgs have Epic.
* Dropped {{@Transactional}} from both refresh endpoints so no DB transaction is held across Epic round trips, and capped bulk at 200 ids.

h3. Accepted tradeoff

Every attempt records {{last_refreshed_at}}, failures included, which keeps a failing Epic from being re-queried on every request. The cost, reviewed and accepted: a transient Epic outage defers the automatic retry to the next staleness window (7 days), and only a manual refresh recovers sooner. This matters while Mayo prod Epic returns 401 on the FHIR API — a bulk refresh against Mayo before that is fixed would stamp every record it touches.

h3. Acceptance criteria

* A Mayo tenant shows the refresh controls, driven by the server capability rather than a tenant-id prefix
* A Mayo practitioner with a PERID and no name refreshes via the direct identifier lookup
* A PERID with no FHIR Practitioner reports NO_MATCH on a 200, distinct from an Epic failure on a 502, and the attempt is recorded
* One refresh implementation serves both the admin endpoint and the staleness path
* MGB behavior is unchanged: linked users still resolve by clientUserId, named practitioners still resolve by name search

h3. Follow-ups (not in scope)

* {{PractitionerService.findOrCreateByEpicUserIdAndName}} keeps the same name gate on the creation path, so a nameless Mayo PERID is still created as an unenriched stub. Left alone because that path runs on every RAS med admin and the stub now self-heals on the next lookup.
* Bulk refresh is sequential; the 200 cap narrows the proxy-timeout window rather than closing it. Making it asynchronous is the real fix.
* The dormant PROVID / {{client_user_id}} mismatch in the SIU AIP anesthesia lookup remains (tracked under OR-2642 follow-ups).

## Comments (1)

### Automation for Jira — 2026-08-14T14:12:53

The linked issue - OR-2784 has been resolved


## Previous automated runs of this ticket

- 2026-08-24T18:45:30Z  aborted: run killed by terminal timeout before the session started
- 2026-08-24T18:49:31Z  aborted: suspended by SIGTTIN before the session started

Treat these as work already done. Do not repeat a settled conclusion; if a
previous run was blocked, start from that blocker rather than from scratch.
