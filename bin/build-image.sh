#!/bin/sh
# Builds the app-under-test image from current origin/main in a dedicated detached worktree,
# so the developer's own checkout and running instance are never disturbed.
#
#   build-image.sh
#
# Prints a JSON descriptor on stdout ({image, sha, tag}); diagnostics go to stderr.
# Exit: 0 built, 1 error.
set -eu

ORCI_ROOT="${ORCI_ROOT:-$HOME/dev/orci}"
BUILD_TREE="${LOOP_BUILD_TREE:-$HOME/dev/worktrees/_loop-main}"
IMAGE_REPO="${LOOP_IMAGE_REPO:-guidedclinical/orci}"

say() { printf '%s\n' "$*" >&2; }
die() { say "Error: $*"; exit 1; }

command -v mvn >/dev/null 2>&1 || die "mvn is not on PATH."
command -v docker >/dev/null 2>&1 || die "docker is not on PATH."

# The build worktree is shared, and a concurrent runner would checkout and compile underneath this
# one. Wait rather than fail: the other build usually produces the very image this run wants.
BUILD_LOCK="${BUILD_TREE}.lock"
waited=0
until mkdir "$BUILD_LOCK" 2>/dev/null; do
    waited=$((waited + 10))
    [ "$waited" -ge "${BUILD_LOCK_TIMEOUT:-900}" ] && die "timed out waiting for the build lock at ${BUILD_LOCK}"
    [ "$waited" = 10 ] && say "another build holds ${BUILD_LOCK}; waiting"
    sleep 10
done
trap 'rmdir "$BUILD_LOCK" 2>/dev/null || true' EXIT INT TERM

git -C "$ORCI_ROOT" fetch --quiet origin || die "git fetch origin failed."

if [ ! -d "$BUILD_TREE" ]; then
    say "Creating build worktree at ${BUILD_TREE}"
    git -C "$ORCI_ROOT" worktree add --detach "$BUILD_TREE" origin/main >&2 ||
        die "could not create build worktree."
else
    # Detached with no local commits, so moving it to the new origin/main is always safe.
    git -C "$BUILD_TREE" checkout --detach --quiet origin/main ||
        die "could not move build worktree to origin/main."
fi

sha=$(git -C "$BUILD_TREE" rev-parse --short=9 HEAD)
full_sha=$(git -C "$BUILD_TREE" rev-parse HEAD)
tag="loop-${sha}"
image="${IMAGE_REPO}:${tag}"

if docker image inspect "$image" >/dev/null 2>&1; then
    say "Image ${image} already built for ${sha} — reusing."
else
    # CodeArtifact tokens expire; refresh unconditionally rather than parsing a 401 out of Maven.
    if command -v aws >/dev/null 2>&1; then
        CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
            --domain guided-clinical --domain-owner 926418967601 \
            --query authorizationToken --output text --region us-east-2 2>/dev/null || true)
        export CODEARTIFACT_AUTH_TOKEN
        [ -n "${CODEARTIFACT_AUTH_TOKEN}" ] ||
            say "WARNING: could not refresh the CodeArtifact token; the build may 401."
    fi

    say "Building ${image} from ${sha}"
    # jib:dockerBuild, never jib:build — the latter would push to a registry.
    ( cd "$BUILD_TREE" && mvn -B -P build-image -DskipTests \
        -Dbuild.image.tag="$tag" -pl orci -am package jib:dockerBuild >&2 ) ||
        die "image build failed for ${sha}."
fi

docker image inspect "$image" >/dev/null 2>&1 || die "build reported success but ${image} is absent."

jq -nc --arg image "$image" --arg sha "$full_sha" --arg tag "$tag" \
    '{image: $image, sha: $sha, tag: $tag}'
