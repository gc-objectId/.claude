#!/bin/sh
# Claims a test file for one ticket's coverage, so two runs cannot both write into it.
#
#   test-file-claim.sh take OR-1234 orci/src/test/java/.../FooTest.java   -> 0 held, 3 held by someone else
#   test-file-claim.sh holder orci/src/test/.../FooTest.java              -> prints the owning ticket
#   test-file-claim.sh release OR-1234                                    -> drop every claim of a ticket
#   test-file-claim.sh reap                                               -> drop claims whose worktree is gone
#   test-file-claim.sh claims                                             -> what is held, and by which ticket
#
# OR-3185 and OR-3186 validated in the same sweep and both proposed a test into
# InternalNotificationServiceTest.java. Two branches cut from the same main inserted at the same
# anchor, so whichever PR merges first forces a rebase on the other. Nothing could see the collision:
# each run only read the repo, and the other branch did not exist yet. A claim closes that window.
#
# The claim is advisory and short-lived: it lives only while the coverage worktree does, which is
# until its PR merges and teardown runs.
set -eu

STATE="${JIRA_WATCH_HOME:-$HOME/.claude/jira-watch}/state"
WORKTREE_ROOT="${WORKTREE_ROOT:-$HOME/dev/worktrees}"
CLAIMED="${STATE}/test-files.tsv"
LOCK="${STATE}/.test-file-claim.lock"

mkdir -p "$STATE"
touch "$CLAIMED"

# flock is not on macOS; mkdir is the portable atomic test-and-set.
with_lock() {
    _tries=0
    while ! mkdir "$LOCK" 2>/dev/null; do
        _tries=$((_tries + 1))
        [ "$_tries" -lt 100 ] || { printf 'test-file-claim: lock held too long\n' >&2; exit 1; }
        sleep 0.1
    done
    trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT INT TERM
    "$@"
}

holder_of() {
    awk -F'\t' -v f="$1" '$1 == f { print $2; exit }' "$CLAIMED"
}

do_take() {
    ticket="$1"
    file="$2"
    held=$(holder_of "$file")
    if [ -n "$held" ] && [ "$held" != "$ticket" ]; then
        printf '%s\n' "$held"
        printf 'test-file-claim: %s is already claimed by %s\n' "$file" "$held" >&2
        exit 3
    fi
    if [ -z "$held" ]; then
        printf '%s\t%s\t%s\n' "$file" "$ticket" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >>"$CLAIMED"
    fi
    printf '%s\n' "$ticket"
}

do_release() {
    grep -v "	${1}	" "$CLAIMED" >"${CLAIMED}.tmp" 2>/dev/null || true
    mv "${CLAIMED}.tmp" "$CLAIMED"
    printf 'released every claim of %s\n' "$1"
}

# A claim outlives its usefulness the moment the worktree that held it is torn down, which happens
# when the coverage PR merges. Nothing else has to remember to release it.
do_reap() {
    kept=''
    while IFS="$(printf '\t')" read -r file ticket at; do
        [ -n "$file" ] || continue
        if find "$WORKTREE_ROOT" -maxdepth 1 -name "${ticket}-*" -print -quit 2>/dev/null | grep -q .; then
            kept="${kept}${file}	${ticket}	${at}
"
        else
            printf 'reaped %s (worktree for %s is gone)\n' "$file" "$ticket"
        fi
    done <"$CLAIMED"
    printf '%s' "$kept" >"$CLAIMED"
}

case "${1:-}" in
    take)    shift; with_lock do_take "${1:?need a ticket}" "${2:?need a file path}" ;;
    holder)  shift; holder_of "${1:?need a file path}" ;;
    release) shift; with_lock do_release "${1:?need a ticket}" ;;
    reap)    with_lock do_reap ;;
    claims)  cat "$CLAIMED" ;;
    *)
        printf 'usage: test-file-claim.sh take TICKET PATH | holder PATH | release TICKET | reap | claims\n' >&2
        exit 1
        ;;
esac
