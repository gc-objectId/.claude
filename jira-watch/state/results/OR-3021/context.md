# OR-3021 — Move remaining GitHub Actions off the Node 20 runtime

Status: Testing   Assignee: Ryan Ducharme

## Description

GitHub is removing Node 20 from Actions runners ([changelog|https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/]). PR #4163 moved most workflows to Node 24 actions, but main still pins actions that run on Node 20 or older, mostly in pr-gate.yml and maven-ci.yml.

Scope:

* actions/checkout@v4 -> v5
* actions/setup-node@v4 -> v5
* actions/upload-artifact@v4 -> v6
* actions/cache@v4 and actions/cache/restore@v4 -> v5
* actions/download-artifact@v6 -> v7
* actions/create-github-app-token@v2 -> v3
* aws-actions/configure-aws-credentials@v4 -> v6
* dorny/paths-filter@v3 -> v4
* dependabot/fetch-metadata@v2 -> v3
* whelk-io/maven-settings-xml-action@v21 (node16, no Node 24 release) -> s4u/maven-settings-action@v4.0.0, which the other workflows already use

Done when no workflow on main pins an action whose runs.using is node20 or older.

## Comments (0)

(none)
