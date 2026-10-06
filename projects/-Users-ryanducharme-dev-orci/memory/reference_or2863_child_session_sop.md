---
name: or2863-child-session-sop
description: "How a child-ticket session under the OR-2863 design epic must work — epic integration branch, CI-only snapshots, cascade gate, fixed Vite port per ticket, PR and merge rules"
metadata:
  node_type: memory
  type: reference
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
  modified: 2026-10-05T20:26:36.333Z
---

Every open child of OR-2863 carries this as "## Working this ticket" in Jira; this is the canonical copy.

**Branch.** From and into `epic/OR-2863-design-foundation`, never `main`. Ryan's normal path is
`workon OR-NNNN slug` (assigns the ticket, names the worktree) — it cuts from `main`, so the session's first act
is `git fetch origin && git reset --hard origin/epic/OR-2863-design-foundation` before any commit (lossless while
the branch has no own commits; 2995/2996/3001 all did this). Equivalent by hand:
`git worktree add ~/dev/worktrees/OR-NNNN-slug -b feature/OR-NNNN-slug origin/epic/OR-2863-design-foundation`. Fresh worktree: `npm ci` in `orci/src/main/webapp`
and in `qa-suite`. Rebase on `origin/epic/OR-2863-design-foundation` after any sibling merges; baseline PNG
conflicts resolve by re-downloading from your own CI run. Never rebase the epic branch itself — the epic session
merges `main` into it. Exception: OR-2977 (viewport logging) goes straight to `main`.

**Ports (fixed per ticket, no coordination needed).** 3000 + 8080 = Ryan's main app, never touched.
3001 = epic session workbench. Children run Vite from the webapp with
`VITE_PORT=<port> BROWSER=none node_modules/.bin/vite` (proxies to 8080; set
`VITE_PROXY_HOST_URL=http://localhost:808N` only if the ticket runs its own backend — pick the lowest free of
8081–8089 with `lsof -nP -iTCP -sTCP:LISTEN`). Chrome cookies are shared across localhost ports, so a 3000 login
works on any of them. `npx vite` from the wrong cwd downloads a different vite — use `node_modules/.bin/vite`.

| Ticket | Vite | Ticket | Vite |
|---|---|---|---|
| OR-2995 patients | 3003 | OR-2992 overlays | 3008 |
| OR-2996 clinical data | 3004 | OR-2999 debugger | 3009 |
| OR-2997 platform/ops | 3005 | OR-3002 Storybook | 3010 (+6006) |
| OR-2991 simulations | 3006 | OR-3003 Bootstrap 5.3 | 3011 |
| OR-2998 test utilities | 3007 | OR-3005 admin footer | 3012 |
| OR-2879 App Home | 3013 | OR-2880 handbook | 3014 (+ backend 808N) |
| OR-2404 admin IA | 3015 | OR-2405 nav proposal | docs only |

**Visual gate.** Snapshots come from CI only; `*-darwin.png` is gitignored. New VIS cases are added and
captured *before* the restyle so the change is graded. Recipe: push → `gh workflow run pr-gate.yml --ref
feature/OR-NNNN-slug -f update_visual_snapshots=true` → `gh run download <id> -R guidedclinical/orci -n
pr-gate-visual-snapshots` → commit only the `*-linux.png` the ticket declared. A dispatch ≈ 20 min and a
`gh run watch` needs restarting every 10 min; batch visual tweaks before dispatching. The PR's own gate runs
the visual project automatically when the PR touches the webapp. To localize a failure: download
`pr-gate-test-results` and `npm run visual:diff -- actual.png expected.png` in `qa-suite`. Two CI renders of
an unchanged screen are byte-identical — a byte diff is a real diff.

**Cascade gate.** Before claiming "no visual delta" on any stylesheet change:
`npm run check:cascade -- origin/epic/OR-2863-design-foundation` in the webapp (per-selector effective diff +
equal-specificity order flips; blind to pairs that only share an element in the DOM — for those, open the same
page on 3001 and your port and compare computed styles).

**PR and close-out.** Open the PR only after the rebaseline PNGs are committed and pushed — Ryan merges drafts promptly (OR-2996 merged with stale baselines). `gh pr create --draft --base epic/OR-2863-design-foundation`; Ryan merges child PRs
himself (the auto-mode classifier blocks `gh pr merge`). Ticket stays In Progress until the merge; merging into
the epic triggers no CD. After the merge the epic session pulls, restarts 3001, and regates the epic branch.

See [[project-or2863-design-foundation]].
