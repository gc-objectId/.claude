from __future__ import annotations
import asyncio, os, sys, json

REPO = "/Users/ryanducharme/dev/worktrees/OR-2691-update-slack-notifications-for/tools/deploy"
sys.path[:0] = [f"{REPO}/src", f"{REPO}/tests"]

import httpx, respx
from guidedor_deploy import config, run_pipeline
from guidedor_deploy.models import BuildMode, DeployConfig
from guidedor_deploy.services import runner as svc_runner, slack
import test_run_pipeline as H


class Monkey:
    def __init__(self): self._undo = []
    def setattr(self, obj, name, val):
        self._undo.append((obj, name, getattr(obj, name)))
        setattr(obj, name, val)
    def delenv(self, k, raising=False): os.environ.pop(k, None)
    def undo(self):
        for obj, name, old in reversed(self._undo): setattr(obj, name, old)
        self._undo.clear()


def scenario(label, target, announced_by_ci=False, slack_ok=True, slack_error=None):
    mp = Monkey()
    calls = H.stub_services(mp)
    # Let the REAL slack module run: notify + resolve_mention hit the wire.
    mp.setattr(slack, "notify", slack.notify.__wrapped__ if hasattr(slack.notify, "__wrapped__") else _real_notify)
    mp.setattr(slack, "resolve_mention", _real_resolve)
    mp.setattr(config, "SLACK_TOKEN", "xoxb-test-token")
    log_path = f"/tmp/or2691-{label}.log"
    fh = open(log_path, "w")
    mp.setattr(svc_runner, "_log_file", fh)
    mp.setattr(svc_runner, "_log_path", log_path)
    os.environ.pop("SLACK_ANNOUNCED_BY_CI", None)
    if announced_by_ci:
        os.environ["SLACK_ANNOUNCED_BY_CI"] = "true"

    cfg = DeployConfig(build_mode=BuildMode.DEPLOY_EXISTING, targets=[target], image_tag="0.1.99")
    r, rlog, steps = H.make_runner(cfg)

    posts = []
    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://slack.com/api/users.lookupByEmail").mock(
            return_value=httpx.Response(200, json={"ok": True, "user": {"id": "U123"}}))
        mock.get("https://slack.com/api/users.list").mock(
            return_value=httpx.Response(200, json={"ok": True, "members": []}))
        def capture(request):
            posts.append(json.loads(request.content))
            body = {"ok": slack_ok, "ts": "1.0"}
            if not slack_ok: body["error"] = slack_error
            return httpx.Response(200, json=body)
        mock.post("https://slack.com/api/chat.postMessage").mock(side_effect=capture)
        ok = asyncio.get_event_loop().run_until_complete(r.run())

    fh.close()
    mp.undo()
    os.environ.pop("SLACK_ANNOUNCED_BY_CI", None)
    print(f"\n### {label}")
    print(f"  deploy_succeeded  = {ok}")
    from guidedor_deploy.pipeline import compute_steps
    lbl = next(st.label for st in compute_steps(cfg) if st.label.endswith(": Slack"))
    print(f"  slack_step[{lbl}] = {H.status_of(steps, cfg, lbl)}")
    print(f"  chat.postMessage calls = {len(posts)}")
    for p in posts:
        print(f"    channel = {p['channel']!r}")
        print(f"    text    = {p['text']!r}")
    for e in rlog.errors: print(f"  LOG ERROR: {e}")
    for l in rlog.lines:
        if "Slack" in l: print(f"  LOG INFO : {l}")
    return posts, ok


_real_notify = slack.notify
_real_resolve = slack.resolve_mention

if __name__ == "__main__":
    print("=" * 70)
    print("SLACK_CHANNEL   =", config.SLACK_CHANNEL)
    print("AWS_PROD.url    =", config.AWS_PROD.url)
    print("=" * 70)
    scenario("A-dev-local-deploy", H.AWS_DEV)
    scenario("B-prod-local-deploy", H.AWS_PROD)
    scenario("C-ci-deploy-announced", H.AWS_DEV, announced_by_ci=True)
    scenario("D-slack-rejects-ok-false", H.AWS_DEV, slack_ok=False, slack_error="channel_not_found")
