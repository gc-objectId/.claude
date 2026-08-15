#!/bin/sh
# Decides whether a validation run has earned its Jira write, then performs it.
#
#   gate.sh <run-dir> [--commit]
#
# Reads <run-dir>/runner.json (runner-owned facts) and <run-dir>/session.json (session claims).
# Default is dry-run: it prints the decision and the comment it would post, and changes nothing.
# --commit actually posts the comment and transitions the ticket.
#
# The freshness check is re-run here rather than read from either file: a session must not be
# able to certify the build it was validated against.
#
# Exit: 0 admitted (posted, or would post), 1 usage/error, 8 refused.
set -eu

ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.claude/bin}"
MIN_EVIDENCE_CHARS="${MIN_EVIDENCE_CHARS:-60}"

. "${CLAUDE_BIN}/jira.sh"

say() { printf '%s\n' "$*" >&2; }
die() { say "Error: $*"; exit 1; }

[ $# -ge 1 ] || { say "Usage: gate.sh <run-dir> [--commit]"; exit 1; }

run_dir="$1"
commit="${2:-}"
runner_json="${run_dir}/runner.json"
session_json="${run_dir}/session.json"

[ -f "$runner_json" ] || die "missing ${runner_json}"

ticket=$(jq -r '.ticket' "$runner_json")
sha=$(jq -r '.sha' "$runner_json")
[ -n "$ticket" ] && [ "$ticket" != 'null' ] || die "runner.json has no ticket"

refuse() {
    say "REFUSED ${ticket}: $*"
    jq -nc --arg t "$ticket" --arg r "$*" '{ticket: $t, admitted: false, reason: $r}'
    exit 8
}

# A session that crashed or never wrote its file is a refusal, not an error.
[ -f "$session_json" ] || refuse "session wrote no result file"
jq -e . "$session_json" >/dev/null 2>&1 || refuse "session result file is not valid JSON"

verdict=$(jq -r '.verdict // ""' "$session_json")
case "$verdict" in
    deploy-ready) ;;
    not-deploy-ready | inconclusive) refuse "verdict is '${verdict}'" ;;
    *) refuse "verdict '${verdict}' is not one of deploy-ready/not-deploy-ready/inconclusive" ;;
esac

for field in positive negative red_check; do
    value=$(jq -r --arg f "$field" '.evidence[$f] // ""' "$session_json")
    [ -n "$value" ] || refuse "evidence.${field} is empty"
    len=$(printf '%s' "$value" | wc -c | tr -d ' ')
    [ "$len" -ge "$MIN_EVIDENCE_CHARS" ] ||
        refuse "evidence.${field} is ${len} chars, below the ${MIN_EVIDENCE_CHARS} minimum"
done

comment_body=$(jq -r '.jira_comment // ""' "$session_json")
[ -n "$comment_body" ] || refuse "jira_comment is empty"

# The rest of the evidence is prose the gate cannot check. This turns the central claim — that the
# check was actually seen red — into something verifiable: the signature the session says it
# provoked must really appear in the application log captured from the run.
app_log="${run_dir}/app.log"
signature=$(jq -r '.red_check_signature // ""' "$session_json")
[ -n "$signature" ] || refuse "red_check_signature is missing — the red check is unverifiable"
sig_len=$(printf '%s' "$signature" | wc -c | tr -d ' ')
[ "$sig_len" -ge 20 ] || refuse "red_check_signature is ${sig_len} chars, too generic to prove anything"
[ -f "$app_log" ] || refuse "no captured application log to verify the red check against"
if ! grep -qF -- "$signature" "$app_log"; then
    refuse "red_check_signature does not appear in the captured application log — the red check did not happen as described"
fi
say "Red check verified: signature present in the captured application log"

say "Re-verifying freshness for ${ticket} against ${sha} (not trusting the session's claim)"
fresh=$("${CLAUDE_BIN}/freshness.sh" "$ticket" "$sha" 2>/dev/null) || fresh_rc=$?
fresh_rc="${fresh_rc:-0}"
[ "$fresh_rc" -eq 0 ] || refuse "freshness re-check failed (rc=${fresh_rc}) — build did not contain the fix"

pr_number=$(printf '%s' "$fresh" | jq -r '.merge_commits[0].number // empty')
[ -n "$pr_number" ] || refuse "could not resolve a merged PR to cite"
pr_url="https://github.com/guidedclinical/orci/pull/${pr_number}"

status_now=$(jira_issue_status "$ticket" 2>/dev/null || true)
case "$status_now" in
    'Ready for Testing' | 'Testing') ;;
    Done) refuse "ticket is already Done — someone moved it during the run" ;;
    '') refuse "could not read the ticket's current status" ;;
    *) refuse "ticket moved to '${status_now}' during the run" ;;
esac

# Tamper detection is the real boundary. The session runs with the developer's full authority, so
# it could write to Jira through some other MCP tool or straight through REST; what it cannot do is
# make those writes invisible. Anything that moved since the runner's baseline invalidates the run.
baseline_status=$(jq -r '.baseline.status // ""' "$runner_json")
baseline_comments=$(jq -r '.baseline.comments // -1' "$runner_json")
if [ -n "$baseline_status" ] && [ "$status_now" != "$baseline_status" ]; then
    refuse "status changed from '${baseline_status}' to '${status_now}' during the run — not by this pipeline"
fi
if [ "$baseline_comments" -ge 0 ]; then
    comments_now=$(jira_comment_count "$ticket" 2>/dev/null || echo -1)
    if [ "$comments_now" -lt 0 ]; then
        refuse "could not re-read the comment count to check for tampering"
    fi
    if [ "$comments_now" -ne "$baseline_comments" ]; then
        refuse "comment count went from ${baseline_comments} to ${comments_now} during the run — the ticket was commented on outside this pipeline"
    fi
fi
say "No tampering: status and comment count match the runner's baseline"

# Plain text only: the v2 comment endpoint does not render markdown, so any syntax the session
# emitted would appear as literal punctuation. Strip the common markers rather than trusting it.
comment_body=$(printf '%s' "$comment_body" | sed -e 's/\*\*//g' -e 's/`//g')

full_comment="${comment_body}

Implementation: ${pr_url}
Validated against ${sha} in an isolated ephemeral environment."

if [ "$commit" != '--commit' ]; then
    say "ADMITTED ${ticket} (dry-run — nothing posted, ticket left in '${status_now}')"
    say '--- comment that would be posted ---'
    printf '%s\n' "$full_comment" >&2
    say '--- end ---'
    jq -nc --arg t "$ticket" --arg pr "$pr_url" --arg c "$full_comment" \
        '{ticket: $t, admitted: true, dry_run: true, pr: $pr, comment: $c}'
    exit 0
fi

jira_add_comment "$ticket" "$full_comment" || refuse "could not post the validation comment"
say "Posted validation comment on ${ticket}"

# Comment first, then transition: a Done ticket with no explanation is worse than a commented
# ticket that still needs moving, and the comment failing must not leave a silent Done.
jira_transition_to "$ticket" Done || refuse "comment posted but the Done transition failed"
say "Transitioned ${ticket} to Done"

jq -nc --arg t "$ticket" --arg pr "$pr_url" \
    '{ticket: $t, admitted: true, dry_run: false, pr: $pr, posted: true, transitioned: "Done"}'
