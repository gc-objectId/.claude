#!/bin/sh
# Jira REST helpers, sourced by the jira-watch scripts. Reads are unrestricted; the two write
# helpers at the bottom are called only by runner.sh (status) and gate.sh (comment + Done).

JIRA_BASE="${JIRA_BASE:-https://guidedclinical.atlassian.net}"
JIRA_EMAIL="${JIRA_EMAIL:-ryan.ducharme@guidedclinical.com}"

_jira_curl() {
    _token=$(security find-generic-password -s jira-api-token -w 2>/dev/null) || return 1
    [ -n "$_token" ] || return 1
    # Credentials go in via -K stdin so they never land in argv, where ps would expose them.
    printf 'user = "%s:%s"\n' "$JIRA_EMAIL" "$_token" |
        curl -K - -sS --fail-with-body --max-time 30 -H 'Accept: application/json' "$@"
}

jira_issue_field() {
    _jira_curl "${JIRA_BASE}/rest/api/3/issue/$1?fields=$2" | jq -r ".fields.$3 // empty"
}

jira_issue_status() {
    jira_issue_field "$1" status 'status.name'
}

jira_issue_type() {
    jira_issue_field "$1" issuetype 'issuetype.name'
}

jira_issue_summary() {
    jira_issue_field "$1" summary 'summary'
}

jira_comment_count() {
    _jira_curl "${JIRA_BASE}/rest/api/3/issue/$1?fields=comment" | jq -r '.fields.comment.total // 0'
}

# Which transition ids exist depends on the issue's current status.
jira_transition_to() {
    _tt_id=$(_jira_curl "${JIRA_BASE}/rest/api/3/issue/$1/transitions" |
        jq -r --arg s "$2" '.transitions[] | select(.to.name == $s) | .id' | head -1)
    [ -n "$_tt_id" ] || {
        printf 'no transition to "%s" available from the current status\n' "$2" >&2
        return 1
    }
    _jira_curl -o /dev/null -X POST -H 'Content-Type: application/json' \
        --data "$(jq -nc --arg id "$_tt_id" '{transition: {id: $id}}')" \
        "${JIRA_BASE}/rest/api/3/issue/$1/transitions"
}

# v3 requires ADF; v2 takes a plain string, so post bare URLs.
jira_add_comment() {
    _jira_curl -o /dev/null -X POST -H 'Content-Type: application/json' \
        --data "$(jq -nc --arg b "$2" '{body: $b}')" \
        "${JIRA_BASE}/rest/api/2/issue/$1/comment"
}

# Branch/directory-safe slug from an issue summary: first four words, lowercased.
jira_slug() {
    _slug=$(printf '%s' "$1" |
        tr '[:upper:]' '[:lower:]' |
        tr -cs 'a-z0-9' '-' |
        cut -d- -f1-4 |
        sed -e 's/^-*//' -e 's/-*$//')
    printf '%s' "${_slug:-ticket}"
}

# Emits "KEY<TAB>SUMMARY" per matching issue, following pagination to the last page.
jira_search_keys() {
    _jql="$1"
    _token_page=''
    while :; do
        _body=$(jq -nc --arg jql "$_jql" --arg tok "$_token_page" \
            '{jql: $jql, fields: ["summary"], maxResults: 100}
             + (if $tok == "" then {} else {nextPageToken: $tok} end)')

        _page=$(_jira_curl -X POST -H 'Content-Type: application/json' \
            --data "$_body" "${JIRA_BASE}/rest/api/3/search/jql") || return 1

        printf '%s' "$_page" | jq -r '.issues[]? | [.key, .fields.summary] | @tsv'

        [ "$(printf '%s' "$_page" | jq -r '.isLast')" = 'false' ] || break
        _token_page=$(printf '%s' "$_page" | jq -r '.nextPageToken // empty')
        [ -n "$_token_page" ] || break
    done
}

# Description and every comment, as markdown on stdout. v2 returns them as plain strings; v3 returns ADF.
jira_issue_context() {
    _jira_curl "${JIRA_BASE}/rest/api/2/issue/$1?fields=summary,description,status,assignee,comment" |
        jq -r '
            "# \(.key) — \(.fields.summary)",
            "",
            "Status: \(.fields.status.name)   Assignee: \(.fields.assignee.displayName // "unassigned")",
            "",
            "## Description",
            "",
            (.fields.description // "(no description)"),
            "",
            "## Comments (\(.fields.comment.total))",
            "",
            (
                if (.fields.comment.total // 0) == 0 then "(none)"
                else (.fields.comment.comments[] |
                    "### \(.author.displayName) — \(.created[0:19])\n\n\(.body)\n")
                end
            )'
}

jira_assign() {
    _jira_curl -o /dev/null -X PUT -H 'Content-Type: application/json' \
        --data "$(jq -nc --arg a "$2" '{accountId: $a}')" \
        "${JIRA_BASE}/rest/api/3/issue/$1/assignee"
}

jira_update_comment() {
    _jira_curl -o /dev/null -X PUT -H 'Content-Type: application/json' \
        --data "$(jq -nc --arg b "$3" '{body: $b}')" \
        "${JIRA_BASE}/rest/api/2/issue/$1/comment/$2"
}

# v2 so the description can be plain text rather than ADF.
jira_create_issue() {
    _jira_curl -X POST -H 'Content-Type: application/json' \
        --data "$(jq -nc --arg p "$1" --arg t "$2" --arg s "$3" --arg d "$4" \
            '{fields: {project: {key: $p}, issuetype: {name: $t}, summary: $s, description: $d}}')" \
        "${JIRA_BASE}/rest/api/2/issue" | jq -r '.key // empty'
}

jira_link_issues() {
    _jira_curl -o /dev/null -X POST -H 'Content-Type: application/json' \
        --data "$(jq -nc --arg a "$1" --arg b "$2" \
            '{type: {name: "Relates"}, inwardIssue: {key: $a}, outwardIssue: {key: $b}}')" \
        "${JIRA_BASE}/rest/api/2/issueLink"
}

# Emits "KEY<TAB>STATUS" per subtask.
jira_subtask_statuses() {
    _jira_curl "${JIRA_BASE}/rest/api/2/issue/$1?fields=subtasks" |
        jq -r '.fields.subtasks[]? | [.key, .fields.status.name] | @tsv'
}

jira_update_description() {
    _jira_curl -o /dev/null -X PUT -H 'Content-Type: application/json' \
        --data "$(jq -nc --arg d "$2" '{fields: {description: $d}}')" \
        "${JIRA_BASE}/rest/api/2/issue/$1"
}
