import base64, json, os, re, subprocess, sys
root = sys.argv[1]
specs = set()
for d in (".github/workflows", ".github/actions"):
    p = os.path.join(root, d)
    if not os.path.isdir(p): continue
    for dp, _, fs in os.walk(p):
        for f in fs:
            if f.endswith((".yml", ".yaml")):
                for m in re.finditer(r'uses:\s*([A-Za-z0-9_.-]+/[A-Za-z0-9_./-]+)@([^\s#]+)', open(os.path.join(dp, f)).read()):
                    specs.add((m.group(1), m.group(2)))
def fetch(owner, repo, path, ref):
    r = subprocess.run(["gh", "api", f"repos/{owner}/{repo}/contents/{path}?ref={ref}", "--jq", ".content"], capture_output=True, text=True)
    if r.returncode != 0: return None
    return base64.b64decode(r.stdout).decode()
for path, ref in sorted(specs):
    parts = path.split("/"); owner, repo = parts[0], parts[1]; sub = "/".join(parts[2:])
    using = "UNRESOLVED"
    for fn in ("action.yml", "action.yaml"):
        txt = fetch(owner, repo, (sub + "/" if sub else "") + fn, ref)
        if txt:
            m = re.search(r'^\s*using:\s*["\']?([^\s"\']+)', txt, re.M)
            using = m.group(1) if m else "no-using-key"
            break
    print(f"{path}@{ref:<12} {using}")
