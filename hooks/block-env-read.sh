#!/usr/bin/env bash
# PreToolUse hook: deny reads of .env secrets files via any tool (Bash/Read/Edit/Grep).
# Allows committed templates (.env.example / .sample / .template / .dist).
# Catches compound Bash commands (e.g. `echo hi && cat .env`) since it scans the
# whole command string, not just a prefix.
#
# Wired up in ~/.claude/settings.json under hooks.PreToolUse with matcher
# "Bash|Read|Edit|Grep". Input is the tool-call JSON on stdin; on a match it
# prints a permissionDecision:deny object and exits 0 (Claude Code reads the JSON).

input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // ""')

if [ "$tool" = "Bash" ]; then
  target=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
else
  target=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // ""')
fi

# Match a .env filename token that is NOT a known-safe template suffix.
if printf '%s' "$target" \
  | perl -ne 'if (/\.env\b(?!\.(example|sample|template|dist)\b)/){$f=1} END{exit($f?0:1)}'; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked: this references a .env secrets file. Templates (.env.example/.sample/.template/.dist) are allowed; for real env files, ask Ryan to run the command."}}'
fi
