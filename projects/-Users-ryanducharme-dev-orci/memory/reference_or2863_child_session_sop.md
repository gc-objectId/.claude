---
name: or2863-child-session-sop
description: "How a child-ticket session under the OR-2863 design epic must work — epic integration branch, CI-only snapshots, cascade gate, fixed Vite port per ticket, PR and merge rules"
metadata:
  node_type: memory
  type: reference
  originSessionId: 8b2e40f6-1d9d-4a6d-8f0c-3db0d5fa37d0
  modified: 2026-10-15T18:05:00.000Z
---

Every open child of OR-2863 carries this as "## Working this ticket" in Jira; this is the canonical copy.

**Branch.** From and into `epic/OR-2863-design-foundation`, never `main`. Ryan's normal path is
`workon OR-NNNN slug` (assigns the ticket, names the worktree) — it cuts from `main`, so the session's first act
is `git fetch origin && git reset --hard origin/epic/OR-2863-design-foundation` before any commit (lossless while
the branch has no own commits; 2995/2996/3001 all did this). Equivalent by hand:
`git worktree add ~/dev/worktrees/OR-NNNN-slug -b feature/OR-NNNN-slug origin/epic/OR-2863-design-foundation`. Fresh worktree: `npm ci` in `orci/src/main/webapp`
and in `qa-suite`. Rebase on `origin/epic/OR-2863-design-foundation` after any sibling merges; baseline PNG
conflicts resolve by re-downloading from your own CI run. Never rebase the epic branch itself — the epic session
merges `main` into it. Exception: OR-2977 (viewport logging) goes straight to `main`. OR-2404/2405/2879/2880 moved to epic OR-3054 (2026-10-15) and branch from `main` after this epic lands.

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
| OR-3045 chain (3045/3048/3047) | 3016 | OR-3050 Event Center | 3017 (+ backend 8081) |
| OR-3046 launch by ID | 3019 | OR-3061 dev banner tests | 3020 (+ backend 808N) |
| OR-3062 Single mode med list | 3021 | OR-3064 unknown patient 404 | 3022 (+ backend 808N) |
| OR-2870 INS-004 visible card | 3023 (qa-suite only) | OR-3067 gate artifacts | none (workflow only) |
| OR-3068 VIS-030 pane height | 3024 (qa-suite only) | OR-3070 case-screen states | 3025 |
| OR-3071 simulation without MGH | 3026 (+ backend 808N) | OR-3072 stale flag lists | 3027 |
| OR-3073 dev banner case screen | 3028 (+ backend 808N) | OR-3074 launch screens | 3032 |
| OR-3075 EHR lookup Sentry | 3029 (+ backend 808N) | OR-3076 Event Center case start | 3030 (+ backend 808N) |
| OR-3077 admin review fixes | 3031 | OR-3078 records cleanup | 3033 (+ Storybook 6007) |
| OR-3079 red-check new tests | 3034 (+ backend 808N) | | |

**Record first (added 2026-10-14).** Every child's Jira description has a "## Record" section; follow it before
writing code. Behavior change (route, redirect, what a control does, what a request carries) → `/feature-spec`:
a baseline if none exists, else a CHANGE against the baseline (OR-3043 baselines `front-door.md`,
`admin-shell.md`, `event-center.md` on the epic branch; conventions per OR-3017: EARS lines with permanent ids,
evidence ledger Tested/Code only/Suspect, test names carry the ids; the approved diff goes into the ticket's acceptance criteria and ships in the SAME PR as the code per `spec/README.md`, never a spec-only PR). Visual-only
change → diff against the design record (`spec/design/tokens.md` + Storybook stories from OR-3002); a new token
or shared surface is documented in the record in the same PR. Never both-in-one: structure PR first, style PR after.

**Jira edits race with child sessions.** Child sessions write acceptance criteria into their own tickets while the epic session plans; always re-read a ticket immediately before replacing its description (the 2026-10-14 planning edit overwrote the chain's approved spec diffs and had to be restored from the changelog).

**Follow-ups go under OR-3054 (2026-10-16).** Anything a child finds that is not needed to merge OR-2863 becomes a child of
OR-3054 (admin IA, landing surfaces and design-foundation follow-ups), whose children all land as commits on ONE branch
`epic/OR-3054-admin-ia-and-cleanup` (cut from main after OR-2863 merges; sessions one at a time in that worktree, Vite 3013;
no per-child PRs). Copy the Working block from any OR-3054 child (e.g. OR-3084). Never file it as a relates-to of OR-2863.

**Comments must not name the epic.** A Jira automation links an issue to every key mentioned in a comment on it, so a close-out comment saying `epic/OR-2863-design-foundation` creates a redundant child→epic link. Write "into the epic branch" and link the PR instead; same for sibling keys. See [[jira-automation-links-mentioned-keys]].

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
