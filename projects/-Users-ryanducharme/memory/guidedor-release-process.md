---
name: guidedor-release-process
description: "How GuidedOR actually releases (tags via maven-release, explicit versioned deploys) and how each environment is used — facts from Theo, June 10 2026 meeting"
metadata: 
  node_type: memory
  type: project
  originSessionId: c76675ad-3acb-4958-ae3c-8e19426c5768
---

GuidedOR's actual release process (per Theo, "Branching Strategy/Environments" huddle, June 10 2026):

- PR → CI build → merge to `main` → auto-build + deploy to **dev**. Dev = "latest and greatest that is testable," not necessarily releasable.
- Release: team "blesses" dev (QA signoff), runs `maven release:prepare` (creates a **version tag**) then `release:perform` (builds Docker images from the tag, pushes to repos). Deploys are explicit: `bin/deploy` targeting an environment with a version (e.g. 0.1.1 → staging, 0.2.2 → prod).
- **Hotfixes branch from the released tag, not main** (main may have moved); fix is forward-ported to main.
- **Stage is client-facing** (client integrations), needs stability, gets a build roughly every 2 weeks following release cadence. Do NOT design anything that churns stage per-merge.
- Full qa-suite (~94 tests) runs against dev after every merge and takes **~7.5–8 minutes** (Ryan's correction; "5 min" from the meeting transcript was off) — suite speed is NOT a constraint for gating decisions (as of mid-2026).
- Team: 3 developers (Ryan, Theo, Jordan). Theo holds off merging approved PRs for a couple of days around releases to keep sprint A/B work separate; Jordan finds this "a little awkward but not that bad."

This means main-is-already-releasable-via-tags; the process is effectively trunk-based with deliberate tagged releases. See [[or-2452-epic-descope]].
