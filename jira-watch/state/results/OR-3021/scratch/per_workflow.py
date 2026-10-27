import json, subprocess
def api(path):
    r = subprocess.run(["gh","api",path],capture_output=True,text=True)
    return json.loads(r.stdout) if r.stdout.strip() else {}
def node20_hits(run_id):
    hits=[]
    for j in api(f"repos/guidedclinical/orci/actions/runs/{run_id}/jobs?per_page=60").get("jobs",[]):
        for a in api(f"repos/guidedclinical/orci/check-runs/{j['id']}/annotations") or []:
            m=a.get("message","")
            if "Node.js 20" in m or "node20" in m.lower(): hits.append(f"[{j['name']}] {m[:140]}")
    return hits
wfs = api("repos/guidedclinical/orci/actions/workflows?per_page=100").get("workflows",[])
print("=== latest completed run on main per workflow (post-fix) ===")
for wf in sorted(wfs, key=lambda w: w["path"]):
    if wf["state"]!="active": continue
    runs = api(f"repos/guidedclinical/orci/actions/workflows/{wf['id']}/runs?branch=main&status=completed&per_page=1").get("workflow_runs",[])
    if not runs:
        runs = api(f"repos/guidedclinical/orci/actions/workflows/{wf['id']}/runs?status=completed&per_page=1").get("workflow_runs",[])
        tag=" (not main)"
    else: tag=""
    if not runs: print(f"{wf['path']:<48} no completed runs"); continue
    r=runs[0]; h=node20_hits(r["id"])
    print(f"{wf['path']:<48} run {r['id']} {r['created_at'][:10]} {r['head_branch']}{tag} {r['conclusion']:<9} node20={len(h)} {h[:1]}")
print("\n=== pre-fix runs (created before 2026-10-08) for pr-gate / maven-ci / qa-suite ===")
for wf in wfs:
    if wf["path"] not in (".github/workflows/pr-gate.yml",".github/workflows/maven-ci.yml",".github/workflows/qa-suite.yml",".github/workflows/deploy.yml"): continue
    runs = api(f"repos/guidedclinical/orci/actions/workflows/{wf['id']}/runs?status=completed&created=2026-09-25..2026-10-07&per_page=3").get("workflow_runs",[])
    for r in runs[:2]:
        h=node20_hits(r["id"])
        print(f"{wf['path']:<48} run {r['id']} {r['created_at'][:10]} {r['head_branch']} {r['conclusion']:<9} node20={len(h)} {h[:2]}")
