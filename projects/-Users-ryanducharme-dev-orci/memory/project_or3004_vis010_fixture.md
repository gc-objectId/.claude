---
name: project-or3004-vis010-fixture
description: "OR-3004 VIS-010 from a fixed feature flag fixture — draft PR #4633 into epic/OR-2863-design-foundation opened 2026-10-02, CI rebaseline dispatched; page.route via URL predicate, enableDate 0 reads as missing publish date, nested npm :local scripts swallowed -- args (fixed), OR-3005 filed for the fixed-bottom admin footer"
metadata:
  node_type: memory
  type: project
  originSessionId: d69697bf-ed1d-4d9f-9ceb-82968456da95
  modified: 2026-10-02T23:32:45.372Z
---

OR-3004 (Task under OR-2863, assigned Ryan, In Progress) — worktree `~/dev/worktrees/OR-3004-vis010-fixture`,
branch `feature/OR-3004-vis010-fixture` (correctly based on the epic branch @ 2123166e9, unlike OR-3001's
`workon` from main), [draft PR #4633](https://github.com/guidedclinical/orci/pull/4633) → epic branch,
opened 2026-10-02 23:31Z. Rebaseline dispatch run 37078005059 (`update_visual_snapshots=true`); the two
`admin-feature-flags-*-linux.png` still need to be committed from its `pr-gate-visual-snapshots` artifact.
Ticket stays In Progress until merge (IMPLEMENT mode).

**What shipped:** `qa-suite/visual/feature-flag-stub.ts` — 14 flags sorted by name (server sorts
`featureName` asc), `stubFeatureFlagList(page)` answers `/api/admin/feature-flags/flags` with page/size/search
from the query string so "Showing 10 of 14" / "Page 1 of 2" render from fixture data. Placed under `visual/`
(not `fixtures/`) because the gate's `webapp` path filter includes `qa-suite/visual/**` and not `fixtures/**`.
`adminSession(browser, path, { readyMarker, stubApi })` — the stub must be registered before `page.goto`.
Ready check = 10 `table tbody tr` rows.

**Gotchas:** (1) `describeFlagStatus` does `if (!publishDate)` so `enableDate: 0` — which the qa-suite
`enableFeatureFlag` helper writes and the runtime treats as enabled — renders "disabled: missing publish date";
fixture uses `Date.UTC(2024, 0, 1)`. (2) Playwright ≥1.51 treats `?` in route globs literally; a URL predicate
on `url.pathname` sidesteps it. (3) `visual:local` etc. were `TEST_ENV=x npm run <script>` — a nested
`npm run` swallows `-- --grep` as npm config ("Unknown cli config --grep"); fix = trailing ` --` on the nested
script (applied to visual/smoke/clinical-rules :local/:dev). `--list` with a dependency chain still lists the
dependency projects' tests — that is not a grep failure. (4) Fresh worktree: `npm ci` in qa-suite, backend
`./mvnw -q -DskipTests install` does NOT bundle the webapp — run `./mvnw -q -pl orci process-resources -P
package-webapp` before `spring-boot:run` (8081, `-Duser.timezone=UTC -Dtenants.demo.qa.enabled=true`). The
hook blocks any command naming `.env*` (even `ls`/`cp`) — Ryan copies `~/dev/orci/qa-suite/.env.local` via `!`;
`BASE_URL=http://localhost:8081` on the command line overrides the file.

**Flip evidence:** stub disabled → 36,753 px differ at 1920×1080 vs the fixture baseline; restored → green;
two consecutive runs byte-identical.

**Spun out:** OR-3005 (Task under OR-2863, To Do, unassigned) — admin `Footer` is `fixed-bottom` with a
`padding-bottom` hack in `AdminPage.scss`; full-page captures show it painting over the pagination row at
1280×800. Proposed: flex-column `AdminPage` with the footer in flow; declared delta VIS-006–010.

See [[project-or2863-design-foundation]], [[project-or2994-admin-shell]].
