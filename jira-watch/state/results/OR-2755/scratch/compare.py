import subprocess, sys
friendly = {
 "UNCATEGORIZED":"Uncategorized","DELAYED_MISSED_OR_WRONG_ANTIBIOTIC":"Delayed/Missed/Wrong Antibiotic",
 "VITAL_SIGNS":"Vital Signs","WRONG_DOSE":"Wrong Dose","WRONG_MED":"Wrong Medication","NMB":"NMB",
 "ALLERGY_AND_INTERACTIONS":"Allergy & Drug-Drug Interactions","MONITORING":"Monitoring",
 "DIABETES_MANAGEMENT":"Diabetes Management","ERAS":"ERAS"}
def load(p):
    d={}
    for l in open(p):
        l=l.strip()
        if not l: continue
        k,v=l.split("|",1); d[k]=v
    return d
post=load("expected_post.txt"); pre=load("expected_pre.txt"); db=load(sys.argv[1])
ok=bad=0
for rid,cat in sorted(post.items()):
    exp=friendly[cat]; got=db.get(rid,"<MISSING>")
    mark="OK " if got==exp else "BAD"
    if got==exp: ok+=1
    else: bad+=1
    print(f"{mark} {rid:60s} pre={friendly[pre[rid]]:34s} expected={exp:34s} db={got}")
print(f"\nmatched={ok} mismatched={bad}")
