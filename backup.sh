#!/bin/bash
set -euo pipefail

REPO="/Users/ryanducharme/.claude"
cd "$REPO"

# Any failure raises a visible signal: a desktop notification plus a FAIL line in
# the log. Silent push failures are what let this repo drift dozens of commits behind.
fail() {
    osascript -e "display notification \"$1\" with title \"⚠️ Claude backup failed\" sound name \"Basso\"" 2>/dev/null || true
    echo "$(date '+%Y-%m-%d %H:%M:%S') FAIL: $1" >&2
    exit 1
}
trap 'fail "backup.sh errored near line $LINENO — see backup.log"' ERR

git add -A

if git diff --cached --quiet; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') no changes to back up"
    exit 0
fi

git commit -m "backup $(date '+%Y-%m-%d %H:%M')"

git push || fail "git push failed — commits are local only, see backup.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') backup committed and pushed"
