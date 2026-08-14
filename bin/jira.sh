#!/bin/sh
# Read-only Jira REST helpers, sourced by the jira-watch scripts.

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
