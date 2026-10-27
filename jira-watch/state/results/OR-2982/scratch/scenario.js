const { request, login } = require("./http.js");
const [label, gender, height, weight, creatinine] = process.argv.slice(2);
const h = { "X-Tenant-Id": "demo-demo" };
(async () => {
  await login("admin", "admin", "admin");
  await login("user", "loopuser", "LoopValidate1!");
  const p = await request("admin", "POST", "/api/admin/patients/", { headers: h, body: { prmnPrefix: label, firstName: label, lastName: "IBW", dob: "1976-01-01", height, weight, gender, genderIdentity: gender } });
  if (p.status !== 200) { console.log("create patient", p.status, JSON.stringify(p.body)); return; }
  const { pmrn, uuid } = p.body;
  const op = await request("admin", "POST", `/api/admin/patients/${uuid}/operations/create`, { headers: h, body: { startTime: new Date().toISOString(), procedureTypes: [{ id: "p-angiogram-arm", qualifier: null }] } });
  if (op.status !== 200) { console.log("create op", op.status, JSON.stringify(op.body)); return; }
  const caseId = op.body.caseId;
  const obs = await request("admin", "POST", `/api/admin/observations/patient/${pmrn}/case/${caseId}`, { headers: h, body: { type: "CREATININE", value: creatinine, units: "mg/dL", date: new Date().toISOString() } });
  const pt = await request("admin", "GET", `/api/admin/patients/by-pmrn/${pmrn}`, { headers: h });
  const { execSync } = require("child_process");
  const evicted = execSync(`docker exec orci-loop-or-2982-redis-1 valkey-cli -a 'g76!s4z' --no-auth-warning del 'patients/demo-demo/${pmrn}'`).toString().trim();
  console.log("cache evicted:", evicted);
  console.log(`== ${label}: pmrn=${pmrn} caseId=${caseId} obs=${obs.status} patient: gender=${pt.body.gender} height=${JSON.stringify(pt.body.height)} weight=${JSON.stringify(pt.body.weight)} dob=${pt.body.dob}`);
  for (const med of ["m-ketorolac", "m-lidocaine"]) {
    const r = await request("user", "POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { headers: h, body: { medicationIdentifier: med, timeZone: "America/New_York", isReselection: false } });
    if (r.status !== 200) { console.log(med, r.status, JSON.stringify(r.body).slice(0, 500)); continue; }
    for (const res of r.body.results || []) {
      const d = res.details || {};
      const keep = Object.fromEntries(Object.entries(d).filter(([k]) => /WEIGHT|CRCL|MAX|DOSE_MG|PATIENT_WEIGHT|CALC/i.test(k) && typeof d[k] !== "object"));
      console.log(`  ${med} rule=${res.ruleId || res.ruleIdentifier} needsAction=${res.needsAction} prompt=${(res.prompt && res.prompt.title) || ""} details=${JSON.stringify(keep)}`);
    }
  }
  const { execSync: ex2 } = require("child_process");
  const ctx = ex2(`docker logs --tail 3000 orci-loop-or-2982-orci-1 2>&1 | grep "Rule context" | grep "${pmrn}" | grep -o "creatinine=[^,]*, pediatricStatus=[^,]*, pregnant=[^,]*, crCl=[^,]*, idealWeight=[^,]*, actualWeight=[^,]*, adjustedWeight=[^,]*" | sort -u`).toString().trim();
  console.log("  context log:", ctx.replace(/\n/g, " | "));
  const iw = ex2(`docker logs --tail 3000 orci-loop-or-2982-orci-1 2>&1 | grep "${pmrn}" | grep -o "ideal-weight: .*\|Latest CrCl: .*" | sort -u`).toString().trim();
  console.log("  ketorolac log:", iw.replace(/\n/g, " | "));
  const nf = await request("admin", "GET", `/api/admin/rule/evaluations/not-fired?caseId=${caseId}&limit=200`, { headers: h });
  for (const n of (Array.isArray(nf.body) ? nf.body : [])) {
    if (/ketorolac|meperidine|local|last|lidocaine|vanco/i.test(n.ruleIdentifier)) console.log(`  not-fired ${n.ruleIdentifier}: ${n.explanation}`);
  }
})().catch(e => console.error("ERR", e));
