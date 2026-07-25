---
name: reference_claude_config_backup
description: "~/.claude is a git repo auto-backed-up daily via launchd; how it's wired and how to fix drift"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 67a16d0a-62ab-4dc8-a7dd-99c69bf910c1
  modified: 2026-07-24T14:18:48.420Z
---

`~/.claude` is a git repo (remote `github.com/gc-objectId/.claude.git`, private) holding Ryan's Claude config — global CLAUDE.md, skills, and the per-project memory files. It is **auto-committed and pushed daily at 10:00** by `~/.claude/backup.sh`, scheduled via a **launchd LaunchAgent** (`~/Library/LaunchAgents/com.ryanducharme.claude-backup.plist`, label `com.ryanducharme.claude-backup`). Commits use the message convention `backup YYYY-MM-DD HH:MM`. Ryan does not commit here by hand — the routine does.

**Why launchd, not cron (fixed 2026-07-23):** the old `0 10 * * *` cron job committed fine but its `git push` failed silently every day (`could not read Username for 'https://github.com': Device not configured`) — cron has no TTY/unlocked-keychain context, so the HTTPS `osxkeychain` credential was unreachable. It drifted 38 commits behind before anyone noticed. A LaunchAgent runs in the GUI session, which *can* read the login keychain, so the same HTTPS+osxkeychain push works. The cron line was removed (the separate `~/.assistant/scripts/backup.sh` cron entry was left alone).

**Failure signal:** `backup.sh` now runs `set -euo pipefail` with an ERR trap + explicit push-failure branch that fire a desktop notification ("⚠️ Claude backup failed") and log a `FAIL:` line. Log is `~/Library/Logs/claude-backup.log` (outside the repo, so it isn't swept into `git add -A`).

**If it drifts again:** check `~/Library/Logs/claude-backup.log`; `launchctl print gui/501/com.ryanducharme.claude-backup` for schedule/state; `launchctl kickstart -k gui/501/com.ryanducharme.claude-backup` to force a run. Most likely cause is auth (token rotation) — interactive `git push` from `~/.claude` will reveal it.
