#!/bin/sh
# Sends a Slack message via an incoming webhook. The digest is pull-only; this is the push side,
# so a refusal or a blocked ticket reaches Ryan's phone without him going looking.
#
#   notify.sh "message text"
#   printf '...' | notify.sh -
#
# The webhook lives in the macOS keychain, service name slack-webhook-jira-watch. Absent webhook
# is a warning, never a failure: notification must not be able to break a validation run.
set -eu

SERVICE="${SLACK_WEBHOOK_SERVICE:-slack-webhook-jira-watch}"

if [ "${1:-}" = '-' ]; then
    text=$(cat)
else
    text="${1:-}"
fi
[ -n "$text" ] || { printf 'notify.sh: nothing to send\n' >&2; exit 0; }

hook=$(security find-generic-password -s "$SERVICE" -w 2>/dev/null || true)
if [ -z "$hook" ]; then
    printf 'notify.sh: no webhook in keychain (service %s); message not sent:\n%s\n' "$SERVICE" "$text" >&2
    exit 0
fi

payload=$(jq -nc --arg t "$text" '{text: $t}')

# An invalid webhook path 302s, which --fail-with-body treats as success, so check the body too.
resp=$(mktemp)
code=$(printf '%s' "$payload" | curl -sS -o "$resp" -w '%{http_code}' --max-time 15 \
    -X POST -H 'Content-Type: application/json' --data @- "$hook" 2>/dev/null || printf '000')
body=$(head -c 64 "$resp" 2>/dev/null || true)
rm -f "$resp"

if [ "$code" = '200' ] && [ "$body" = 'ok' ]; then
    printf 'notify.sh: delivered\n' >&2
else
    printf 'notify.sh: NOT delivered (http %s, body "%s") — message was:\n%s\n' \
        "$code" "$body" "$text" >&2
fi
exit 0
