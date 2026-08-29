---
name: reference-sentry-events-have-no-release
description: Sentry events carry no release tag, so dating a build means matching stack line numbers against git; MGB shows as tenant mgb-mgh / env guidedor.partners.org
metadata:
  type: reference
---

Sentry events from orci carry **no `release` tag**. `tools/deploy/.../services/sentry.py` runs
`sentry-cli releases new/set-commits/finalize` on every deploy, so release *objects* exist, but
nothing stamps `sentry.release` onto events — it is absent from `application.yml`, every
`application-*.yml`, and `SentryConfiguration.java`. The issue page's "Releases" panel is always
empty. Tracked on [[project-or1579-sentry-releases]].

To date the build that produced an event, match its stack-frame line numbers against `git show
<commit>:<path> | sed -n '<line>p'` across candidate commits. This only ever yields a *range* —
verify both ends, because a file untouched by the fix keeps identical line numbers across it. On
OR-2774 the frames matched both the pre-fix commit and the fix merge, so the method could not
answer the question at all.

Reading the deployed image is the fallback: `oc project mgb-guidedor-prod` then
`oc get deployment/guidedor -o jsonpath='{.spec.template.spec.containers[?(@.name=="guidedor")].image}'`.
No kubeconfig exists on this machine, so MGB OpenShift logins have to be set up first.

Identifying the deployment from an event: MGB self-hosted prod is `tenant: mgb-mgh`,
`environment: guidedor.partners.org`, OpenShift project `mgb-guidedor-prod`. AWS envs use their own
`environment` values. See [[mgh-data-not-in-aws-rds]].

Sentry also reopens a Done Jira ticket on any new event against a resolved issue, so a reopen is
not evidence the fix failed — see [[project-or2620-hl7-auth-sentry-noise]].
