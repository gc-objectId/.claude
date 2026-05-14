#!/bin/bash
set -e

cd /Users/ryanducharme/.claude

git add -A

# Nothing staged, nothing to do
git diff --cached --quiet && exit 0

git commit -m "backup $(date '+%Y-%m-%d %H:%M')"
git push
