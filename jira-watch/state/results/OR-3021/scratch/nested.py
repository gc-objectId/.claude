import base64, re, subprocess
def fetch(owner, repo, path, ref):
    r = subprocess.run(["gh","api",f"repos/{owner}/{repo}/contents/{path}?ref={ref}","--jq",".content"],capture_output=True,text=True)
    return base64.b64decode(r.stdout).decode() if r.returncode==0 else ""
for owner, repo, ref in [("anthropics","claude-code-action","v1"),("getsentry","action-release","v3")]:
    txt = fetch(owner, repo, "action.yml", ref)
    nested = sorted(set(re.findall(r'uses:\s*([^\s#]+)', txt)))
    print(f"{owner}/{repo}@{ref}: nested uses -> {nested}")
    for n in nested:
        if "@" not in n or n.startswith("./"): continue
        p, r = n.split("@",1); parts=p.split("/")
        sub="/".join(parts[2:]); inner=fetch(parts[0],parts[1],(sub+"/" if sub else "")+"action.yml",r)
        m=re.search(r'^\s*using:\s*["\']?([^\s"\']+)',inner,re.M)
        print(f"   {n}: {m.group(1) if m else 'unresolved'}")
