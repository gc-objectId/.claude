#!/bin/sh
# Allocates qa-suite test ids (PREFIX-NNN) without collisions.
#
#   test-id.sh next ARD           -> ARD-009
#   test-id.sh next ARD 3         -> ARD-009 ARD-010 ARD-011
#   test-id.sh release ARD-009    -> drop a reservation that was never written
#   test-id.sh reservations       -> what is held, and by which run
#
# Two runs validating different tickets both proposed "LAMD-002" because each only read the repo.
# A reservation file plus a lock closes that window: the id is held the moment it is handed out and
# released when the branch that took it merges, or by hand if the work was abandoned.
set -eu

ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"
SUITE="${ORCI_ROOT}/qa-suite"
STATE="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}/state"
RESERVED="${STATE}/test-ids.tsv"
LOCK="${STATE}/.test-id.lock"

mkdir -p "$STATE"
touch "$RESERVED"

# Ids live in the spec files, not an index, so the repo is the only authority on what is taken.
taken_in_repo() {
    grep -rhoE "\b$1-[0-9]{3}\b" --include='*.spec.ts' "$SUITE" 2>/dev/null | sed "s/^$1-//" || true
}

taken_in_reservations() {
    awk -F'\t' -v p="$1" '$1 ~ "^" p "-" { sub("^" p "-", "", $1); print $1 }' "$RESERVED"
}

# flock is not on macOS; mkdir is the portable atomic test-and-set.
with_lock() {
    _tries=0
    while ! mkdir "$LOCK" 2>/dev/null; do
        _tries=$((_tries + 1))
        [ "$_tries" -lt 100 ] || { printf 'test-id: lock held too long\n' >&2; exit 1; }
        sleep 0.1
    done
    trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT INT TERM
    "$@"
}

do_next() {
    prefix="$1"
    count="${2:-1}"
    case "$prefix" in
        [A-Z][A-Z]*) ;;
        *) printf 'test-id: prefix must be upper case letters, got "%s"\n' "$prefix" >&2; exit 1 ;;
    esac

    highest=$({ taken_in_repo "$prefix"; taken_in_reservations "$prefix"; } |
        sed 's/^0*//' | grep -E '^[0-9]+$' | sort -n | tail -1)
    [ -n "$highest" ] || highest=0

    owner="${TEST_ID_OWNER:-$(basename "${PWD}")}"
    at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    i=0
    out=''
    while [ "$i" -lt "$count" ]; do
        highest=$((highest + 1))
        id=$(printf '%s-%03d' "$prefix" "$highest")
        printf '%s\t%s\t%s\n' "$id" "$owner" "$at" >>"$RESERVED"
        out="${out}${id} "
        i=$((i + 1))
    done
    printf '%s\n' "${out% }"
}

do_release() {
    grep -v "^${1}	" "$RESERVED" >"${RESERVED}.tmp" 2>/dev/null || true
    mv "${RESERVED}.tmp" "$RESERVED"
    printf 'released %s\n' "$1"
}

# A reservation whose id now appears in a spec file has served its purpose.
do_reap() {
    kept=''
    while IFS="$(printf '\t')" read -r id owner at; do
        [ -n "$id" ] || continue
        if grep -rqF "$id" --include='*.spec.ts' "$SUITE" 2>/dev/null; then
            printf 'reaped %s (now written)\n' "$id"
        else
            kept="${kept}${id}	${owner}	${at}
"
        fi
    done <"$RESERVED"
    printf '%s' "$kept" >"$RESERVED"
}

case "${1:-}" in
    next)         shift; with_lock do_next "${1:?need a prefix}" "${2:-1}" ;;
    release)      shift; with_lock do_release "${1:?need an id}" ;;
    reap)         with_lock do_reap ;;
    reservations) cat "$RESERVED" ;;
    *) printf 'usage: test-id.sh next PREFIX [COUNT] | release ID | reap | reservations\n' >&2; exit 1 ;;
esac
