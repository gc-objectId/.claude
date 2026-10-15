---
name: project-or3002-storybook-real-theme
description: "OR-3002 Storybook on the real theme — PR #4682 MERGED into the epic 2026-10-14 (13f9d8543), worktree gone; story-id links in the design record, token stories read :root custom properties, no story snapshots; DONE 2026-10-14; Theo review of the record is an epic-PR gate, not this story's"
metadata:
  node_type: memory
  type: project
  originSessionId: e7dca01c-e7c0-42a2-b1b0-a61b1fe3e0d6
  modified: 2026-10-14T16:03:51.514Z
---

OR-3002 (Story under OR-2863, IMPLEMENT) — worktree `~/dev/worktrees/OR-3002-storybook-real-theme`,
branch `feature/OR-3002-storybook-real-theme` reset onto the epic branch (2b17f4a96) before the first
commit. [PR #4682](https://github.com/guidedclinical/orci/pull/4682) merged into
`epic/OR-2863-design-foundation` 2026-10-14 (13f9d8543); worktree and branch removed.

**What landed:** `.storybook/preview.tsx` loads only `index.scss` + `App.scss` (stock
`bootstrap.min.css` import gone) and wraps stories in `QueryClientProvider` + `MemoryRouter`;
`.storybook/decorators.tsx` has `withSignedInUser` (needs the now-exported `AuthContext`). Stories:
`src/styles/{Tokens,Surfaces,Buttons}.stories.tsx`, `components/AdminPage`, `Admin/AdminTable`,
`Admin/FactList`, `SectionHeader`, `Footer`. `spec/design/tokens.md` gained a `## Surfaces` table (and
`docs/templates/spec-design.md` the matching heading — the linter demands exact H2 match) linking each
story by id (`http://localhost:6006/?path=/story/<title-slug>--<export-slug>`); file paths with `.tsx`
are rejected by the linter's code-marker rule, so story ids are the pointer. `storybook-static/` is now
gitignored.

**Decisions:** no story snapshots (visual suite covers the surfaces in situ; Storybook has no CI render).
Storybook is not run in CI — adding `build-storybook` to `typescript.yml` is a suggested follow-up.
Ticket moved to Done 2026-10-14 (Ryan's call: Theo's review of the record gates the epic PR, not this story). The record still says `reviewed: false`.

**Lessons:** in Storybook dev, component-scoped SCSS only loads once that component is imported in the
iframe session, so a story that borrows another component's classes (e.g. `.admin-code`) renders
differently depending on which story opened first — token/surface stories must use only global
styles or Bootstrap utilities. A `fixed-bottom` footer gives its wrapper zero height (waitForSelector
"visible" times out) — give the wrapper `min-height: 100vh`. Verification recipe: Storybook dev on 6006
(`npx storybook dev -p 6006 --ci --no-open`), Vite 3010 from the worktree, Playwright from
`~/dev/orci/qa-suite/node_modules/playwright` comparing computed styles story vs `/login`, plus
`npm run check:cascade -- origin/epic/OR-2863-design-foundation` = 0/0/0/0.

See [[project-or2863-design-foundation]], [[or2863-child-session-sop]].
