---
name: mayo-golive-monitoring
description: Mayo went live ~late July 2026; the error-rate baseline and monitoring work Ryan owns next
metadata: 
  node_type: memory
  type: project
  originSessionId: 160576e1-880b-4ec9-910a-3f5ca2856439
  modified: 2026-08-13T19:09:44.990Z
---

Mayo reached production around **late July 2026** — prod data started arriving a day early and surfaced
errors immediately. Ryan led readiness: vendor-services approval, prod client ID, FDI build promotion, HL7
API credentials, ROJB OR filtering, soak plan. Soak scope was deliberately narrow: confirm interfaces flow
and FHIR APIs are reachable, not feature parity. **Full go-live is Aug 27, 2026**; a minimum-viable-scope
conversation was running as of Aug 13. Ryan is out the week of Aug 17.

**FDB is out permanently (reported 2026-08-13).** First Databank's contract red lines prohibit use in
competing products and they refused to carve out GuidedOR — continuing would be an immediate breach. Mayo
go-live now runs on Jordan Ephron's in-house **RxNorm + FDA-label** mapping for allergy cross-reaction groups
(Karen had him build it in advance anticipating this). Consequence: allergy coverage is newly built code
landing two weeks before go-live, and "no FDB" is a permanent condition inflating the error rate, not a
temporary gap.

**Core product metric (Ryan's to establish):** `error rate = noncompliance events / med admins`. Needs a Mayo
baseline plus threshold alerting so post-deploy drops are caught early rather than reactively. Two distinct
monitoring layers were identified: **operational** (is the integration intact — e.g. Mayo stops sending med
admins) and **data quality** (longitudinal drift — weekly volume moving unexpectedly). This is the concrete
bridge to the company's silent-mode analytics goal, which in turn gates the Interactive Mode conversion
(an equity vesting milestone).

**Open post-go-live items:** anesthesia induction event migration (optime case tracking, targeted 2026-08-06),
repeated sepsis-score observations in TST (Renee investigating, not a blocker), **PHI redaction in CloudWatch
still incomplete** — blocks putting an LLM on prod logs until the Bedrock route is set up. Prod DB query
policy: aggregates only, no PHI columns, minimum 10-sample threshold, results to a local file.

**Ryan's self-identified next project:** spec-driven feature development — markdown feature specs as source
of truth for behavior, flowing down into tests and implementation, so Jira tickets and git history stop being
the reference. Gherkin works at test level; wants a feature-level equivalent. Alex Wolfe would author them
PRD-style. Related ticket: OR-2361. See [[ryan-role-scope]] and [[goal-cycle-2026]].
