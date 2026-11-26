#!/usr/bin/env bash
set -euo pipefail

WEBAPP="$(cd "$(dirname "$0")/.." && pwd)"
BASE_REF="origin/main"
EXTRA=()
for arg in "$@"; do
  case "$arg" in
    --*) EXTRA+=("$arg") ;;
    *) BASE_REF="$arg" ;;
  esac
done

WORK="$(mktemp -d)"
trap 'git -C "$WEBAPP" worktree remove --force "$WORK/base" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

build_css() {
  local dir="$1" out="$2"
  if ! (cd "$dir" && VITE_GIT_SHA=cascade npx vite build --outDir "$WORK/$out-build" --emptyOutDir --logLevel error >"$WORK/$out-build.log" 2>&1); then
    cat "$WORK/$out-build.log" >&2
    exit 1
  fi
  cat "$WORK/$out-build"/static/*.css > "$WORK/$out.raw.css"
  (cd "$WEBAPP" && npx prettier --parser css "$WORK/$out.raw.css" > "$WORK/$out.css")
}

git -C "$WEBAPP" worktree add --detach "$WORK/base" "$BASE_REF" >/dev/null 2>&1
REL="$(git -C "$WEBAPP" rev-parse --show-prefix)"
echo "base: $BASE_REF ($(git -C "$WEBAPP" rev-parse --short "$BASE_REF"))"
if git -C "$WEBAPP" diff --quiet "$BASE_REF" -- package-lock.json; then
  ln -s "$WEBAPP/node_modules" "$WORK/base/$REL/node_modules"
else
  echo "base: package-lock.json differs, installing the base's own dependencies"
  (cd "$WORK/base/$REL" && npm ci --no-audit --no-fund --loglevel=error >/dev/null)
fi
build_css "$WORK/base/$REL" base
build_css "$WEBAPP" head
node "$WEBAPP/scripts/cascade-diff.mjs" "$WORK/base.css" "$WORK/head.css" ${EXTRA[@]+"${EXTRA[@]}"}
