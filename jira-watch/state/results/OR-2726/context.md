# OR-2726 — Cache the whole antibiotic resolution behind a fingerprinted key

Status: Testing   Assignee: unassigned

## Description

h3. Problem

The Redis cache stores only the patient-filtered preferred candidate ids, and it cannot store an empty result at all: setCandidatesInCache joins an empty list to "", which getCandidatesFromCache reads back as a miss. So a case whose every candidate is contraindicated, or whose procedures disagree, re-resolves on every HL7 medication administration and every interactive scan. The contraindicated case is the expensive one: it walks every rank and runs the medication-selection rule engine per medication per candidate group before concluding nothing survives.

OR-2721 also moved the cache check to after protocol resolution, so the selection and EMR paths now load every procedure's candidates rather than stopping at the first configured one, and map candidates for procedures whose groups are never read.

h3. Proposed

* Cache the whole resolution in the current style (ids, not serialized DTOs): the agreed flag, per-procedure (procedureId, qualifier, candidate ids), and the preferred ids. Rebuild with one findByIdIn.
* Put a fingerprint of the resolution inputs in the cache key: sorted procedureId:qualifier pairs plus the case classification. Any change to either misses naturally, from any source.
* Store a sentinel for the empty result so an absent key is distinguishable from a resolution that legitimately preferred nothing. This is where the win is.
* Fail open: any deserialization or validation failure must be treated as a cache miss and recomputed. AntibioticResolution and CaseAntibioticProtocol carry Preconditions in their constructors, so a stale entry written by an older deploy could otherwise throw on the alerting hot path.

h3. Why a fingerprinted key rather than more invalidation hooks

Five call sites invalidate today, all patient- or user-scoped plus two case-scoped: add allergy, delete case allergy, patch procedure-types, patch classification, and set allergy suppression status. Procedure types also change through OperationService and DefaultHL7ProcessingContext, neither of which invalidates. That is already a staleness hole for the cached tier, and caching the protocol would widen it to cover the agreed/suppressed decision and the procedure names an alert prints. A fingerprinted key closes the existing hole instead of inheriting it, and does not depend on future write paths remembering to call invalidate.

h3. Notes

* The key must stay user-scoped: allergy suppression and the qualifiers feature flag both resolve per user.
* TTL is 24h via RedisService.setValue, which for a case measured in hours is not a meaningful safety net.
* Separate, larger win available in the same area: computePreferredForProcedure re-queries the representative's rows via getCandidatesByProcedureTypeId and then once per rank, maxRank + 2 extra round trips per miss, while applicablePerProcedure already holds them. Pre-existing, and it changes candidate-selection code paths, so it wants its own change.
* Depends on OR-2721; stacks after it.

## Comments (1)

### Automation for Jira — 2026-08-12T14:30:45

The linked issue - OR-2721 has been resolved

