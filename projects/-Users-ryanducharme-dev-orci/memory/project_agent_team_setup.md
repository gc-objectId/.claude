---
name: Agent team setup
description: 4-agent team in ~/.claude/agents/ with orci-cmd command center launcher, tmux -CC iTerm2 integration
type: project
originSessionId: f2c17df2-065e-42cb-b95f-6b5023846008
---
**Agent team:** 4 agents in `~/.claude/agents/`:
- `product-analyst.agent.md` (Opus, purple) — specs + Jira
- `qa-engineer.agent.md` (Sonnet, green) — tests in qa-suite/
- `lead-developer.agent.md` (Opus, orange) — app code + JVM tests
- `principal-engineer.agent.md` (Opus, blue) — review + docs/ADRs

**Key decisions:**
- Team lead (main session) owns ALL git write ops — agents never commit/push/branch
- PRs created by Ryan manually unless explicitly asked
- All real-world actions (Jira edits, ticket creation, commits, pushes) require user approval
- Test ownership split: JVM-internal = Lead Dev, running-server = QA
- qa-suite/CLAUDE.md owned by PE, qa-suite/fixtures/test-data.md shared BA+QA
- Module coupling rules enforced in PE + Lead Dev prompts

**Command center:** `orci-cmd` at `~/.local/bin/orci-cmd`
- Launches tmux -CC session (iTerm2 control mode)
- 3 panes: Claude Code (left), git status (top right), file activity stream (bottom right)
- File activity color-coded by agent: purple=BA specs, green=QA tests, yellow=app code, blue=JVM tests, cyan=docs
- Reattaches if session exists; `orci-cmd kill` to tear down

**Solo mode:** Don't invoke agents (tell Claude "handle directly") or use `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0 claude`

**How to apply:** When Ryan asks about the agent team, command center, or setup, reference this. If env var or agent files seem missing, check `~/.claude/settings.json` and `~/.claude/agents/`.
