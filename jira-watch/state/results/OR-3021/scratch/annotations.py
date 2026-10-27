import json, subprocess, sys
def api(path, *jq):
    r = subprocess.run(["gh","api",path,*(["--jq",jq[0]] if jq else [])],capture_output=True,text=True)
    return r.stdout
runs = json.loads(api("repos/guidedclinical/orci/actions/runs?branch=main&per_page=40"))["workflow_runs"]
seen = {}
for run in runs:
    if run["status"] != "completed": continue
    seen.setdefault(run["name"], run)
print(f"{'workflow':<32} {'run':<12} {'created':<22} {'conclusion':<10} node20-annotations")
for name, run in sorted(seen.items()):
    jobs = json.loads(api(f"repos/guidedclinical/orci/actions/runs/{run['id']}/jobs?per_page=50"))["jobs"]
    hits = []
    for j in jobs:
        anns = json.loads(api(f"repos/guidedclinical/orci/check-runs/{j['id']}/annotations") or "[]")
        for a in anns:
            if "Node.js 20" in a.get("message","") or "node20" in a.get("message","").lower():
                hits.append(a["message"][:120])
    print(f"{name:<32} {run['id']:<12} {run['created_at']:<22} {run['conclusion']:<10} {len(hits)} {hits[:1]}")
