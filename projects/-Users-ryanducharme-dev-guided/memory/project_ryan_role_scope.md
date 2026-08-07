---
name: ryan-role-scope
description: "Ryan's actual role at Guided is broader than backend/QA — release sign-off, integration authority, MGH field presence, vendor management"
metadata: 
  node_type: memory
  type: project
  originSessionId: 160576e1-880b-4ec9-910a-3f5ca2856439
  modified: 2026-08-06T18:08:59.084Z
---

Ryan's first orci commit was **2026-03-18** (the Liquibase init-order fix Theo pointed him at, OR-2298). Any
"what has Ryan done" framing should be scaled to that start date — 156 tickets closed and 80 merged PRs in
his first ~4.5 months.

His job is wider than the Jira titles suggest:

- **Mayo integration lead.** Primary Guided point of contact — runs the customer testing calls with Mayo's
  Epic/interface staff (**Renee** analyst, **Britt** Epic tester, **Robert** vendor services/IT), sets the
  testing agenda, designed and ran UAT in Epic TST, drove vendor-services approval and the soak plan.
  **Mayo went live ~late July 2026.** Post-go-live the team works reactively via PRs rather than sprint
  tickets.
- **Release gatekeeper.** Writes the sprint prod-deploy sign-off; Theo tags and releases on it.
- **Integration-readiness authority.** Alex Wolfe asks *him* whether Mayo is solid (meds documented,
  procedures recognized) before telling the customer.
- **MGH clinical field presence.** Has an MGH badge and scrub access (Wang building security office, "Periop
  All Staff"); shadowed Karen Nanji through live OR cases in May 2026.
- **Vendor management.** Owns the Honeywell relationship for 17 MGH barcode scanners that keep losing their
  pairing — clinicians abandoned them because re-pairing isn't obvious. Open since May 2026.
- **Customer test documentation.** Keeper of the Mayo test tracker and MGB TST instructional videos.

**Review dynamics** (79 merged PRs): only 2 changes-requested, so quality is good. Recurring feedback themes
from Theo and Jordan Ephron: pick the cheapest test that proves the thing (integration tests are heavyweight
and don't run in CI), decide where a test belongs, and don't over-test what's structurally identical. He
receives 100+ review comments but has left almost none on others' 13 PRs he reviewed — a real asymmetry.

People: **Karen Nanji** (karen@, co-founder, anesthesiologist — the "KN" in the goal template), **Theodore
Nguyen-Cao** (theo@, "TN", Ryan's manager), **Jordan Ephron** (JEphron, engineer), **Alex Wolfe** (alex@,
customer/product side), **Maya Patel** and **Marin Langlieb** (MGH/study side). GitHub handle: `gc-objectId`;
org `guidedclinical`, repos orci / guided-infrastructure / guided-skills / bsm / hl7-relay.
